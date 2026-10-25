import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { API_URL } from '../../lib/config';

interface Cert { code: string; studentName: string; title: string; groupName: string; schoolName: string; issuedAt: string; valid: boolean }

/** Ochiq sertifikat sahifasi: kirishsiz tekshiriladi, brauzerdan "Chop etish → PDF" qilib saqlanadi. */
export function CertificatePage({ code }: { code: string }) {
  const [cert, setCert] = useState<Cert | null>(null);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/certificates/verify/${encodeURIComponent(code)}`)
      .then(async (r) => { if (!r.ok) throw new Error('Sertifikat topilmadi'); return r.json(); })
      .then((c: Cert) => setCert(c))
      .catch((e) => setErr(e.message || 'Xatolik'));
    QRCode.toDataURL(`${window.location.origin}/certificate/${code}`, { margin: 1, width: 160 }).then(setQr).catch(() => undefined);
  }, [code]);

  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const d = cert ? new Date(new Date(cert.issuedAt).getTime() + 5 * 3_600_000) : null;
  const date = d ? `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}, ${d.getUTCFullYear()}` : '';
  return (
    <div style={{ minHeight: '100vh', background: '#f3efe6', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, fontFamily: 'Georgia, "Times New Roman", serif', color: '#1c1a17' }}>
      <style>{`@media print { .no-print { display:none !important } body { background:#fff } @page { size: A4 landscape; margin: 0 } .sheet { box-shadow:none !important; width:100% !important; height:100vh !important } }`}</style>
      {err && <p style={{ marginTop: 80, fontSize: 18 }}>{err}</p>}
      {!cert && !err && <p style={{ marginTop: 80 }}>Yuklanmoqda…</p>}
      {cert && (
        <>
          <div className="sheet" style={{ width: 'min(100%, 1000px)', aspectRatio: '1.414', background: '#fffdf8', border: '14px double #b8892b', boxShadow: '0 10px 40px rgba(0,0,0,.15)', padding: '5% 6%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center', position: 'relative' }}>
            {!cert.valid && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(40px,10vw,110px)', color: 'rgba(200,30,30,.25)', transform: 'rotate(-18deg)', fontWeight: 700, pointerEvents: 'none' }}>BEKOR QILINGAN</div>}
            <div>
              <div style={{ letterSpacing: '0.35em', fontSize: 'clamp(10px,1.6vw,16px)', color: '#8a6a1e' }}>{cert.schoolName.toUpperCase()}</div>
              <h1 style={{ fontSize: 'clamp(28px,6vw,62px)', margin: '1% 0 0', fontWeight: 700 }}>SERTIFIKAT</h1>
            </div>
            <div>
              <p style={{ fontSize: 'clamp(11px,1.8vw,18px)', margin: 0, color: '#5c5547' }}>Ushbu sertifikat quyidagi shaxsga beriladi</p>
              <p style={{ fontSize: 'clamp(24px,5vw,52px)', margin: '1.5% 0', fontStyle: 'italic', borderBottom: '2px solid #b8892b', display: 'inline-block', padding: '0 4%' }}>{cert.studentName}</p>
              <p style={{ fontSize: 'clamp(13px,2.2vw,24px)', margin: '1% 6% 0' }}>{cert.title}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'left', fontSize: 'clamp(10px,1.5vw,15px)', color: '#5c5547' }}>
              <div><div>Berilgan sana: <b>{date}</b></div><div>Guruh: {cert.groupName}</div><div style={{ marginTop: 4 }}>Kod: <b>{cert.code}</b></div></div>
              <div style={{ textAlign: 'center' }}>{qr && <img src={qr} alt="QR" style={{ width: 'clamp(70px,12vw,120px)' }} />}<div style={{ fontSize: 'clamp(8px,1.1vw,11px)' }}>Haqiqiyligini tekshirish</div></div>
            </div>
          </div>
          <div className="no-print" style={{ marginTop: 16, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
            <p style={{ color: cert.valid ? '#1a7f4b' : '#b3261e', fontWeight: 600 }}>{cert.valid ? '✔ Sertifikat haqiqiy' : '✖ Sertifikat bekor qilingan'}</p>
            <button onClick={() => window.print()} style={{ marginTop: 8, padding: '10px 22px', borderRadius: 12, border: 0, background: '#b8892b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>PDF qilib saqlash / chop etish</button>
          </div>
        </>
      )}
    </div>
  );
}
