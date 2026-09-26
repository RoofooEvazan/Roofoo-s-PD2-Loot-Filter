# Minimal MPQ v1 reader (D2) with PKWARE DCL explode + zlib
import struct, zlib, sys
def _crypt_table():
    t=[0]*0x500; seed=0x00100001
    for i in range(0x100):
        idx=i
        for j in range(5):
            seed=(seed*125+3)%0x2AAAAB; a=(seed&0xFFFF)<<16
            seed=(seed*125+3)%0x2AAAAB; b=seed&0xFFFF
            t[idx]=a|b; idx+=0x100
    return t
CT=_crypt_table()
def hs(s,h):
    s1=0x7FED7FED; s2=0xEEEEEEEE
    for ch in s.upper().replace('/',chr(92)).encode():
        s1=(CT[(h<<8)+ch]^(s1+s2))&0xFFFFFFFF
        s2=(ch+s1+s2+(s2<<5)+3)&0xFFFFFFFF
    return s1
def decrypt(data,key):
    out=bytearray(); s2=0xEEEEEEEE
    for i in range(len(data)//4):
        s2=(s2+CT[0x400+(key&0xFF)])&0xFFFFFFFF
        v=struct.unpack_from('<I',data,i*4)[0]
        v=(v^(key+s2))&0xFFFFFFFF
        key=(((~key<<0x15)+0x11111111)|(key>>0x0B))&0xFFFFFFFF
        s2=(v+s2+(s2<<5)+3)&0xFFFFFFFF
        out+=struct.pack('<I',v)
    return bytes(out)
# blast (PKWARE DCL explode), port of zlib/contrib/blast
class _Huff:
    def __init__(s,lens):
        s.count=[0]*14; s.symbol=[0]*len(lens)
        for l in lens: s.count[l]+=1
        offs=[0]*14
        for l in range(1,13): offs[l+1]=offs[l]+s.count[l]
        for sym,l in enumerate(lens):
            if l: s.symbol[offs[l]]=sym; offs[l]+=1
def _cmp(rep):
    lens=[]
    for b in rep:
        n=(b>>4)+1; l=b&15; lens+= [l]*n
    return _Huff(lens)
LITLEN=[11,124,8,7,28,7,188,13,76,4,10,8,12,10,12,10,8,23,8,9,7,6,7,8,7,6,55,8,23,24,12,11,7,9,11,12,6,7,22,5,7,24,6,11,9,6,7,22,7,11,38,7,9,8,25,11,8,11,9,12,8,12,5,38,5,38,5,11,7,5,6,21,6,10,53,8,7,24,10,27,44,253,253,253,252,252,252,13,12,45,12,45,12,61,12,45,44,173]
LENLEN=[2,35,36,53,38,23]; DISTLEN=[2,20,53,230,247,151,248]
BASE=[3,2,4,5,6,7,8,9,10,12,16,24,40,72,136,264]; EXTRA=[0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8]
HL=_cmp(LITLEN); HLEN=_cmp(LENLEN); HD=_cmp(DISTLEN)
def explode(src):
    pos=[0]; bitbuf=[0]; bitcnt=[0]
    def bits(need):
        val=bitbuf[0]
        while bitcnt[0]<need:
            val|=src[pos[0]]<<bitcnt[0]; pos[0]+=1; bitcnt[0]+=8
        bitbuf[0]=val>>need; bitcnt[0]-=need
        return val&((1<<need)-1)
    def decode(h):
        code=first=index=0; bitb=bitbuf[0]; left=bitcnt[0]; ln=1
        while True:
            while left:
                code|=(bitb&1)^1; bitb>>=1; cnt=h.count[ln]
                if code<first+cnt:
                    bitbuf[0]=bitb; bitcnt[0]=(bitcnt[0]-ln)&7
                    return h.symbol[index+(code-first)]
                index+=cnt; first+=cnt; first<<=1; code<<=1; ln+=1; left-=1
            left=(13-ln)
            if left>8: left=8
            bitb=src[pos[0]]; pos[0]+=1
    lit=bits(8); dic=bits(8); out=bytearray()
    while True:
        if bits(1):
            sym=decode(HLEN); ln=BASE[sym]+bits(EXTRA[sym])
            if ln==519: break
            s=2 if ln==2 else dic
            dist=(decode(HD)<<s)+bits(s)+1
            for _ in range(ln): out.append(out[-dist])
        else:
            out.append(decode(HL) if lit else bits(8))
    return bytes(out)
class MPQ:
    def __init__(s,path):
        s.f=open(path,'rb'); d=s.f.read()
        s.d=d; off=d.find(b'MPQ\x1a')
        s.base=off
        hs_,fs,ver,sec,hto,bto,htn,btn=struct.unpack_from('<4sIIHHIIII',d,off)[:0] or (None,)*8
        (_,hsz,asz,ver,secsh,hto,bto,htn,btn)=struct.unpack_from('<4sIIHHIIII',d,off)
        s.sector=512<<secsh
        s.ht=decrypt(d[off+hto:off+hto+htn*16],hs('(hash table)',3))
        s.bt=decrypt(d[off+bto:off+bto+btn*16],hs('(block table)',3))
        s.htn=htn
    def read(s,name):
        a=hs(name,1); b=hs(name,2); i=hs(name,0)%s.htn
        for _ in range(s.htn):
            h1,h2,loc,plat,blk=struct.unpack_from('<IIHHI',s.ht,i*16)
            if blk==0xFFFFFFFF: return None
            if h1==a and h2==b and blk<0xFFFFFFFE: break
            i=(i+1)%s.htn
        else: return None
        fpos,csize,fsize,flags=struct.unpack_from('<IIII',s.bt,blk*16)
        if not flags&0x80000000: return None
        raw=s.d[s.base+fpos:s.base+fpos+csize]
        key=None
        if flags&0x10000:
            key=hs(name.replace('/',chr(92)).split(chr(92))[-1],3)
            if flags&0x20000: key=(key+fpos)^fsize
        if flags&0x01000000:
            return s._unpack(raw,fsize,flags)
        ns=(fsize+s.sector-1)//s.sector
        if not flags&0x300: return raw[:fsize]
        tbl=raw[:(ns+1)*4]
        if key is not None: tbl=decrypt(tbl,(key-1)&0xFFFFFFFF)
        offs=struct.unpack('<%dI'%(ns+1),tbl); out=bytearray()
        for k in range(ns):
            chunk=raw[offs[k]:offs[k+1]]
            if key is not None:
                pad=len(chunk)%4; chunk=decrypt(chunk[:len(chunk)-pad],(key+k)&0xFFFFFFFF)+chunk[len(chunk)-pad:]
            want=min(s.sector,fsize-k*s.sector)
            out+=s._unpack(chunk,want,flags)
        return bytes(out)
    def _unpack(s,chunk,want,flags):
        if len(chunk)>=want: return chunk
        if flags&0x100: return explode(chunk)
        m=chunk[0]; body=chunk[1:]
        if m&0x08: return explode(body)
        if m&0x02: return zlib.decompress(body)
        raise Exception('unsupported compression %x'%m)
def _dec(b):
    # PD2 string tables are UTF-8; vanilla ones are latin-1
    try: return b.decode('utf-8')
    except UnicodeDecodeError: return b.decode('latin-1')
def tbl(data):
    n=struct.unpack_from('<H',data,2)[0]; hsz=struct.unpack_from('<I',data,4)[0]
    idx=struct.unpack_from('<%dH'%n,data,21); base=21+n*2; res={}
    for i in range(hsz):
        used,_,_,ko,vo,vl=struct.unpack_from('<BHIIIH',data,base+i*17)
        if used:
            k=_dec(data[ko:data.index(b'\0',ko)]); v=_dec(data[vo:data.index(b'\0',vo)])
            res[k]=v
    return res
