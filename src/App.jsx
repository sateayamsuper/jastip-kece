import { useState, useEffect, useMemo, useRef } from 'react';
import { Home, Package, Users, Camera, Plus, X, Share2, MapPin, Search, Edit2, Trash2, ChevronRight, MessageCircle } from 'lucide-react';

// ---------------- Constants ----------------
const CURRENCIES = [
  { code: 'JPY', name: 'Yen Jepang', flag: '🇯🇵', symbol: '¥' },
  { code: 'KRW', name: 'Won Korea', flag: '🇰🇷', symbol: '₩' },
  { code: 'SGD', name: 'Dolar Singapura', flag: '🇸🇬', symbol: 'S$' },
  { code: 'THB', name: 'Baht Thailand', flag: '🇹🇭', symbol: '฿' },
  { code: 'HKD', name: 'Dolar Hong Kong', flag: '🇭🇰', symbol: 'HK$' },
  { code: 'USD', name: 'Dolar AS', flag: '🇺🇸', symbol: '$' },
  { code: 'MYR', name: 'Ringgit Malaysia', flag: '🇲🇾', symbol: 'RM' },
  { code: 'CNY', name: 'Yuan Tiongkok', flag: '🇨🇳', symbol: '¥' },
  { code: 'TWD', name: 'Dolar Taiwan', flag: '🇹🇼', symbol: 'NT$' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'Poundsterling', flag: '🇬🇧', symbol: '£' },
  { code: 'AUD', name: 'Dolar Australia', flag: '🇦🇺', symbol: 'A$' },
  { code: 'VND', name: 'Dong Vietnam', flag: '🇻🇳', symbol: '₫' },
];

const STATUSES = ['Dicari', 'Ketemu', 'Dibeli', 'Dibayar', 'Diantar'];
const STATUS_EMOJI = { Dicari: '🔍', Ketemu: '👀', Dibeli: '🛍️', Dibayar: '💸', Diantar: '📦' };
const CATEGORIES = ['Skincare', 'Kosmetik', 'Fashion', 'Snack', 'Elektronik', 'Obat & Vitamin', 'Lainnya'];
const MARKUP_PRESETS = [10, 15, 20, 25, 30];
const FIXED_JPY_TO_IDR = 109.38;
const FIXED_RATES = { JPY: 1, IDR: FIXED_JPY_TO_IDR };

const storage = {
  async get(key) {
    const value = window.localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key, value) {
    window.localStorage.setItem(key, value);
  },
};

// ---------------- Helpers ----------------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function formatIDR(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rp -';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}
function currencyMeta(code) {
  return CURRENCIES.find((c) => c.code === code) || { code, symbol: code, flag: '' };
}
function formatForeign(amount, code) {
  const m = currencyMeta(code);
  return `${m.symbol}${Number(amount).toLocaleString('id-ID')}`;
}
function convertToIDR(amount, code, rates) {
  if (!rates || amount === '' || amount === null || amount === undefined) return null;
  if (code === 'IDR') return Number(amount);
  const r = rates[code];
  const idr = rates.IDR;
  if (!r || !idr) return null;
  return Number(amount) * (idr / r);
}
function orderFinance(order, rates) {
  const cost = convertToIDR(order.amount, order.currency, rates);
  if (cost === null) return { cost: null, sell: null, margin: null };
  const sell = cost * (1 + (Number(order.markup) || 0) / 100);
  return { cost, sell, margin: sell - cost };
}
function toWaNumber(raw) {
  if (!raw) return '';
  let d = raw.replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (!d.startsWith('62')) d = '62' + d;
  return d;
}
function waLink(raw, text) {
  const num = toWaNumber(raw);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return num ? `https://wa.me/${num}${q}` : `https://wa.me/${q}`;
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function buildInvoiceText(customer, customerOrders, trip, rates) {
  const lines = customerOrders.map((o) => {
    const { sell } = orderFinance(o, rates);
    return `• ${o.itemName} - ${formatIDR(sell)}`;
  });
  const total = customerOrders.reduce((sum, o) => {
    const { sell } = orderFinance(o, rates);
    return sum + (sell || 0);
  }, 0);
  return `Halo ${customer.name}! 👋\nIni rincian titipan kamu dari trip ${trip ? trip.location : ''}:\n\n${lines.join('\n')}\n\nTotal: ${formatIDR(total)}\n\nMakasih ya udah titip! 🙏`;
}
function buildSummaryText(trip, stats, customers) {
  const topCustomer = stats.topCustomerId ? customers.find((c) => c.id === stats.topCustomerId)?.name || '-' : '-';
  return (
    `📦 Rekap Trip Jastip - ${trip.location}\n\n` +
    `Total pesanan: ${stats.count}\n` +
    `Omzet: ${formatIDR(stats.revenue)}\n` +
    `Modal: ${formatIDR(stats.cost)}\n` +
    `Untung bersih: ${formatIDR(stats.margin)}\n` +
    `Pelanggan paling royal: ${topCustomer}\n` +
    `Kategori favorit: ${stats.topCategory || '-'}\n\n` +
    `Makasih semua yang udah titip! 🙏✈️`
  );
}

// ---------------- Small UI atoms ----------------
function Sheet({ title, onClose, children }) {
  return (
    <div className="ov-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="font-display" style={{ fontSize: 22, color: 'var(--text-dark)' }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={20} /></button>
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`chip${active ? ' chip-active' : ''}`}>
      {children}
    </button>
  );
}

function StampRow({ status, onChange }) {
  const idx = STATUSES.indexOf(status);
  return (
    <div className="stamp-row">
      {STATUSES.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'future';
        return (
          <button key={`${s}-${state}`} type="button" className={`stamp stamp-${state}`} onClick={() => onChange(s)} title={s}>
            <span>{STATUS_EMOJI[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Order form ----------------
function OrderFormSheet({ initial, customers, trip, rates, onCancel, onSave, onQuickAddCustomer }) {
  const isEdit = !!initial?.id;
  const [customerId, setCustomerId] = useState(initial?.customerId || '');
  const [itemName, setItemName] = useState(initial?.itemName || '');
  const [store, setStore] = useState(initial?.store || '');
  const [category, setCategory] = useState(initial?.category || CATEGORIES[0]);
  const [currency, setCurrency] = useState(initial?.currency || trip?.defaultCurrency || 'JPY');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [markup, setMarkup] = useState(initial?.markup ?? trip?.defaultMarkup ?? 20);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerWa, setNewCustomerWa] = useState('');

  const { cost, sell } = orderFinance({ amount: amount === '' ? 0 : amount, currency, markup }, rates);

  function handleQuickAddCustomer() {
    if (!newCustomerName.trim()) return;
    const id = onQuickAddCustomer({ name: newCustomerName.trim(), whatsapp: newCustomerWa.trim(), notes: '' });
    setCustomerId(id);
    setNewCustomerMode(false);
    setNewCustomerName('');
    setNewCustomerWa('');
  }

  function handleSubmit() {
    if (!customerId || !itemName.trim() || amount === '' || Number(amount) <= 0) return;
    onSave({
      id: initial?.id || uid(),
      customerId,
      itemName: itemName.trim(),
      store: store.trim(),
      category,
      currency,
      amount: Number(amount),
      markup: Number(markup) || 0,
      status: initial?.status || 'Dicari',
      createdAt: initial?.createdAt || Date.now(),
    });
  }

  const canSave = customerId && itemName.trim() && amount !== '' && Number(amount) > 0;

  return (
    <Sheet title={isEdit ? 'Edit Pesanan' : 'Pesanan Baru'} onClose={onCancel}>
      <div className="field-label">Buat siapa?</div>
      {!newCustomerMode ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {customers.map((c) => (
            <Chip key={c.id} active={customerId === c.id} onClick={() => setCustomerId(c.id)}>{c.name}</Chip>
          ))}
          <Chip active={false} onClick={() => setNewCustomerMode(true)}>+ Pelanggan baru</Chip>
        </div>
      ) : (
        <div className="mb-3 quick-add-box">
          <input className="input mb-2" placeholder="Nama pelanggan" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
          <input className="input mb-2" placeholder="No. WhatsApp (opsional)" value={newCustomerWa} onChange={(e) => setNewCustomerWa(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" onClick={handleQuickAddCustomer}>Simpan</button>
            <button className="btn-ghost btn-sm" onClick={() => setNewCustomerMode(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="field-label">Barangnya apa?</div>
      <input className="input mb-3" placeholder="misal: Serum vitamin C 30ml" value={itemName} onChange={(e) => setItemName(e.target.value)} />

      <div className="field-label">Beli dimana?</div>
      <input className="input mb-3" placeholder="misal: Don Quijote, Olive Young, 7-Eleven" value={store} onChange={(e) => setStore(e.target.value)} />

      <div className="field-label">Kategori</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORIES.map((cat) => (
          <Chip key={cat} active={category === cat} onClick={() => setCategory(cat)}>{cat}</Chip>
        ))}
      </div>

      <div className="field-label">Mata uang</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {CURRENCIES.map((c) => (
          <Chip key={c.code} active={currency === c.code} onClick={() => setCurrency(c.code)}>{c.flag} {c.code}</Chip>
        ))}
      </div>

      <div className="field-label">Harga ({currency})</div>
      <input
        className="input input-mono mb-3"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
      />

      <div className="field-label">Markup (%)</div>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {MARKUP_PRESETS.map((p) => (
          <Chip key={p} active={Number(markup) === p} onClick={() => setMarkup(p)}>{p}%</Chip>
        ))}
        <input className="input input-inline" inputMode="numeric" style={{ width: 64 }} value={markup} onChange={(e) => setMarkup(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>

      <div className="preview-box mb-4">
        <div className="flex justify-between text-sm" style={{ color: 'var(--text-soft)' }}>
          <span>Modal</span><span className="font-mono">{cost !== null ? formatIDR(cost) : 'nunggu kurs...'}</span>
        </div>
        <div className="flex justify-between" style={{ fontSize: 20 }}>
          <span className="font-display">Harga Jual</span>
          <span className="font-mono" style={{ color: 'var(--mango-dark)', fontWeight: 700 }}>{sell !== null ? formatIDR(sell) : '—'}</span>
        </div>
      </div>

      <button className="btn-primary w-full" disabled={!canSave} onClick={handleSubmit}>
        {isEdit ? 'Update Pesanan' : 'Simpan Pesanan'}
      </button>
    </Sheet>
  );
}

// ---------------- Customer form ----------------
function CustomerFormSheet({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({ id: initial?.id || uid(), name: name.trim(), whatsapp: whatsapp.trim(), notes: notes.trim(), createdAt: initial?.createdAt || Date.now() });
  }

  return (
    <Sheet title={initial ? 'Edit Pelanggan' : 'Pelanggan Baru'} onClose={onCancel}>
      <div className="field-label">Nama</div>
      <input className="input mb-3" placeholder="Nama pelanggan" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="field-label">No. WhatsApp</div>
      <input className="input mb-3" placeholder="0812xxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      <div className="field-label">Catatan</div>
      <textarea className="input mb-4" rows={3} placeholder="Item favorit, preferensi antar, dll" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn-primary w-full" disabled={!name.trim()} onClick={handleSubmit}>{initial ? 'Update' : 'Simpan Pelanggan'}</button>
    </Sheet>
  );
}

// ---------------- Trip form ----------------
function TripFormSheet({ onCancel, onSave }) {
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  function handleSubmit() {
    if (!location.trim()) return;
    onSave({ id: uid(), location: location.trim(), startDate, isActive: true, status: 'aktif', defaultMarkup: 20, defaultCurrency: null, createdAt: Date.now() });
  }

  return (
    <Sheet title="Trip Baru" onClose={onCancel}>
      <div className="field-label">Lagi / mau ke mana?</div>
      <input className="input mb-3" placeholder="misal: Tokyo, Jepang" value={location} onChange={(e) => setLocation(e.target.value)} />
      <div className="field-label">Mulai tanggal</div>
      <input type="date" className="input mb-4" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <button className="btn-primary w-full" disabled={!location.trim()} onClick={handleSubmit}>Gas Mulai Trip! ✈️</button>
    </Sheet>
  );
}

// ---------------- Scan sheet ----------------
function ScanSheet({ onClose, onUseResult }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await fileToBase64(file);
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
                {
                  type: 'text',
                  text:
                    'Ini foto struk belanja dari toko luar negeri. Baca dan balas HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan) persis format ini: {"store":"nama toko atau kosong jika tidak jelas","items":[{"name":"nama barang singkat dalam bahasa Indonesia","price":angka,"currency":"KODE3HURUF"}]}. Tebak kode mata uang ISO (JPY, KRW, SGD, THB, HKD, USD, MYR, CNY, TWD, EUR, GBP, AUD, VND) dari simbol/konteks struk. price harus angka murni tanpa simbol atau pemisah ribuan.',
                },
              ],
            },
          ],
        }),
      });
      const data = await resp.json();
      const textBlock = (data.content || []).find((b) => b.type === 'text');
      if (!textBlock) throw new Error('empty');
      const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed.items || !parsed.items.length) throw new Error('no items');
      setResult(parsed);
    } catch {
      setError('Waduh, struknya gagal kebaca 😅 Coba foto ulang yang lebih terang, atau isi manual aja.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="Scan Struk" onClose={onClose}>
      {!result && (
        <div className="scan-drop" onClick={() => inputRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="preview struk" className="scan-preview" />
          ) : (
            <>
              <Camera size={32} />
              <div style={{ marginTop: 8 }}>Tap buat foto struk</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      {loading && <div className="text-center" style={{ padding: 16, color: 'var(--text-soft)' }}>Lagi baca struknya... 🔍</div>}
      {error && (
        <div className="mt-3">
          <div style={{ color: 'var(--coral)', marginBottom: 8 }}>{error}</div>
          <button className="btn-ghost w-full" onClick={() => { setResult(null); setError(null); onUseResult(null); }}>Isi Manual Aja</button>
        </div>
      )}
      {result && (
        <div className="mt-3">
          <div className="field-label">Ketemu {result.items.length} barang{result.store ? ` di ${result.store}` : ''}:</div>
          {result.items.map((it, i) => (
            <div key={i} className="scan-item-row">
              <div>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-soft)' }}>{formatForeign(it.price, it.currency)}</div>
              </div>
              <button className="btn-primary btn-sm" onClick={() => onUseResult({ itemName: it.name, amount: it.price, currency: it.currency, store: result.store || '' })}>Tambah</button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ---------------- Dashboard ----------------
function DashboardView({ stats, rates, customers, outstanding, onShare, onEndTrip }) {
  if (!stats) return null;
  const outstandingEntries = Object.entries(outstanding).filter(([, v]) => v > 0);
  return (
    <div>
      {!rates && <div className="notice-box mb-3">Nunggu koneksi buat ambil kurs... angka di bawah bisa belum akurat.</div>}
      <div className="stat-grid mb-4">
        <div className="stat-card">
          <div className="stat-label">Total Pesanan</div>
          <div className="stat-value font-display">{stats.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Omzet</div>
          <div className="stat-value font-mono">{rates ? formatIDR(stats.revenue) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Modal</div>
          <div className="stat-value font-mono">{rates ? formatIDR(stats.cost) : '—'}</div>
        </div>
        <div className="stat-card stat-card-accent">
          <div className="stat-label">Untung Bersih</div>
          <div className="stat-value font-mono">{rates ? formatIDR(stats.margin) : '—'}</div>
        </div>
      </div>

      {outstandingEntries.length > 0 && (
        <div className="section-block mb-4">
          <div className="section-title">Tagihan Belum Dibayar</div>
          {outstandingEntries.map(([cid, amt]) => {
            const c = customers.find((x) => x.id === cid) || { name: 'Pelanggan dihapus' };
            return (
              <div key={cid} className="row-item">
                <span>{c.name}</span>
                <span className="font-mono" style={{ color: 'var(--coral)' }}>{formatIDR(amt)}</span>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(stats.byCustomer).length > 0 && (
        <div className="section-block mb-4">
          <div className="section-title">Per Pelanggan</div>
          {Object.entries(stats.byCustomer).sort((a, b) => b[1] - a[1]).map(([cid, amt]) => {
            const c = customers.find((x) => x.id === cid) || { name: 'Pelanggan dihapus' };
            return (
              <div key={cid} className="row-item">
                <span>{c.name}</span>
                <span className="font-mono">{formatIDR(amt)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={onShare}><Share2 size={16} /> Ringkasan Trip</button>
        <button className="btn-ghost flex-1" onClick={onEndTrip}>Trip Baru</button>
      </div>
    </div>
  );
}

// ---------------- Orders ----------------
function OrderCard({ order, customer, rates, onEdit, onDelete, onStatusChange }) {
  const { sell } = orderFinance(order, rates);
  return (
    <div className="order-card">
      <div className="flex justify-between items-start">
        <div>
          <div style={{ fontWeight: 700 }}>{order.itemName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{customer.name}{order.store ? ` · ${order.store}` : ''}</div>
        </div>
        <div className="flex gap-1">
          <button className="icon-btn-sm" onClick={onEdit}><Edit2 size={14} /></button>
          <button className="icon-btn-sm" onClick={onDelete}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="flex justify-between items-end mt-2">
        <div style={{ fontSize: 12, color: 'var(--text-soft)' }} className="font-mono">{formatForeign(order.amount, order.currency)}</div>
        <div className="font-mono" style={{ fontWeight: 700, fontSize: 16 }}>{sell !== null ? formatIDR(sell) : 'nunggu kurs'}</div>
      </div>
      <StampRow status={order.status} onChange={onStatusChange} />
    </div>
  );
}

function OrdersView({ orders, rates, search, setSearch, statusFilter, setStatusFilter, getCustomer, onEdit, onDelete, onStatusChange, onAdd }) {
  const filtered = orders.filter((o) => {
    const c = getCustomer(o.customerId);
    const matchesSearch = !search || o.itemName.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sections =
    statusFilter === 'Semua'
      ? STATUSES.map((s) => ({ status: s, items: filtered.filter((o) => o.status === s) })).filter((sec) => sec.items.length > 0)
      : [{ status: statusFilter, items: filtered }];

  return (
    <div>
      <div className="search-row mb-3">
        <Search size={16} />
        <input className="search-input" placeholder="Cari barang atau pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex gap-2 mb-3" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <Chip active={statusFilter === 'Semua'} onClick={() => setStatusFilter('Semua')}>Semua</Chip>
        {STATUSES.map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_EMOJI[s]} {s}</Chip>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-hero">
          <div style={{ fontSize: 32 }}>🛍️</div>
          <p style={{ color: 'var(--text-soft)', marginTop: 8 }}>Belum ada pesanan di sini. Yuk tambahin!</p>
        </div>
      )}

      {sections.map((sec) => (
        <div key={sec.status} className="mb-4">
          {statusFilter === 'Semua' && <div className="section-title">{STATUS_EMOJI[sec.status]} {sec.status} ({sec.items.length})</div>}
          {sec.items.map((o) => (
            <OrderCard key={o.id} order={o} customer={getCustomer(o.customerId)} rates={rates} onEdit={() => onEdit(o)} onDelete={() => onDelete(o.id)} onStatusChange={(s) => onStatusChange(o.id, s)} />
          ))}
        </div>
      ))}

      <button className="fab" onClick={onAdd} aria-label="Tambah pesanan"><Plus size={22} /></button>
    </div>
  );
}

// ---------------- Customers ----------------
function CustomersView({ customers, orders, rates, outstanding, onEdit, onDelete, onAdd, trip }) {
  return (
    <div>
      {customers.length === 0 && (
        <div className="empty-hero">
          <div style={{ fontSize: 32 }}>👥</div>
          <p style={{ color: 'var(--text-soft)', marginTop: 8 }}>Belum ada pelanggan. Tambahin dulu yuk!</p>
        </div>
      )}
      {customers.map((c) => {
        const cOrders = orders.filter((o) => o.customerId === c.id);
        const total = cOrders.reduce((sum, o) => {
          const { sell } = orderFinance(o, rates);
          return sum + (sell || 0);
        }, 0);
        const owed = outstanding[c.id] || 0;
        return (
          <div key={c.id} className="customer-card">
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                {c.whatsapp && <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{c.whatsapp}</div>}
                {c.notes && <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>{c.notes}</div>}
              </div>
              <div className="flex gap-1">
                <button className="icon-btn-sm" onClick={() => onEdit(c)}><Edit2 size={14} /></button>
                <button className="icon-btn-sm" onClick={() => onDelete(c.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{cOrders.length} pesanan · {formatIDR(total)}</span>
              {owed > 0 && <span className="badge-unpaid">Nunggak {formatIDR(owed)}</span>}
            </div>
            {c.whatsapp && cOrders.length > 0 && (
              <a className="btn-ghost btn-sm mt-2" style={{ display: 'inline-flex' }} href={waLink(c.whatsapp, buildInvoiceText(c, cOrders, trip, rates))} target="_blank" rel="noreferrer">
                <MessageCircle size={14} /> Kirim Rincian
              </a>
            )}
          </div>
        );
      })}
      <button className="fab" onClick={onAdd} aria-label="Tambah pelanggan"><Plus size={22} /></button>
    </div>
  );
}

// ---------------- Trip sheet ----------------
function TripSheet({ activeTrip, pastTrips, onClose, onNewTrip, onViewSummary }) {
  return (
    <Sheet title="Trip Kamu" onClose={onClose}>
      {activeTrip && (
        <div className="section-block mb-4">
          <div className="section-title">Trip Aktif</div>
          <div className="row-item">
            <span>{activeTrip.location}</span>
            <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>sejak {new Date(activeTrip.startDate).toLocaleDateString('id-ID')}</span>
          </div>
          <button className="btn-ghost w-full mt-2" onClick={() => onViewSummary(activeTrip.id)}>Lihat Ringkasan</button>
        </div>
      )}
      <button className="btn-primary w-full mb-4" onClick={onNewTrip}>{activeTrip ? 'Selesai & Mulai Trip Baru' : 'Mulai Trip Baru'}</button>
      {pastTrips.length > 0 && (
        <div className="section-block">
          <div className="section-title">Trip Sebelumnya</div>
          {pastTrips.map((t) => (
            <button key={t.id} className="row-item row-item-btn" onClick={() => onViewSummary(t.id)}>
              <span>{t.location}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ---------------- Summary sheet ----------------
function SummarySheet({ trip, orders, customers, rates, onClose }) {
  if (!trip) return null;
  let revenue = 0;
  let cost = 0;
  const byCustomer = {};
  const byCategory = {};
  orders.forEach((o) => {
    const { cost: c, sell: s } = orderFinance(o, rates);
    if (c !== null) {
      revenue += s;
      cost += c;
      byCustomer[o.customerId] = (byCustomer[o.customerId] || 0) + s;
    }
    byCategory[o.category] = (byCategory[o.category] || 0) + 1;
  });
  const topCustomerEntry = Object.entries(byCustomer).sort((a, b) => b[1] - a[1])[0];
  const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const stats = {
    count: orders.length,
    revenue,
    cost,
    margin: revenue - cost,
    topCustomerId: topCustomerEntry ? topCustomerEntry[0] : null,
    topCategory: topCategoryEntry ? topCategoryEntry[0] : null,
  };
  const text = buildSummaryText(trip, stats, customers);

  return (
    <Sheet title={`Ringkasan · ${trip.location}`} onClose={onClose}>
      <div className="stat-grid mb-4">
        <div className="stat-card"><div className="stat-label">Total Pesanan</div><div className="stat-value font-display">{stats.count}</div></div>
        <div className="stat-card"><div className="stat-label">Omzet</div><div className="stat-value font-mono">{formatIDR(stats.revenue)}</div></div>
        <div className="stat-card"><div className="stat-label">Modal</div><div className="stat-value font-mono">{formatIDR(stats.cost)}</div></div>
        <div className="stat-card stat-card-accent"><div className="stat-label">Untung Bersih</div><div className="stat-value font-mono">{formatIDR(stats.margin)}</div></div>
      </div>
      <div className="section-block mb-4">
        <div className="row-item"><span>Pelanggan Paling Royal</span><span>{stats.topCustomerId ? customers.find((c) => c.id === stats.topCustomerId)?.name || '-' : '-'}</span></div>
        <div className="row-item"><span>Kategori Favorit</span><span>{stats.topCategory || '-'}</span></div>
      </div>
      <a className="btn-primary w-full" style={{ display: 'flex', justifyContent: 'center' }} href={waLink('', text)} target="_blank" rel="noreferrer">
        <Share2 size={16} /> Bagikan ke WhatsApp
      </a>
    </Sheet>
  );
}

// ---------------- CSS ----------------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

* { box-sizing: border-box; }

:root {
  --ink: #16232B;
  --ink-2: #1F313C;
  --ink-soft: #8CA0AC;
  --paper: #FBF3E1;
  --paper-dim: #F0E4C7;
  --mango: #F2A83D;
  --mango-dark: #C97F17;
  --teal: #2FB8A6;
  --coral: #FF6B5B;
  --text-dark: #1C2B33;
  --text-soft: #6B7C84;
}

.app-outer { min-height: 100vh; background: var(--ink); display: flex; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; }
.app-shell { width: 100%; max-width: 460px; min-height: 100vh; background: var(--ink); display: flex; flex-direction: column; position: relative; }
@media (min-width: 640px) {
  .app-shell { min-height: 92vh; margin: 4vh 0; border-radius: 28px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); overflow: hidden; }
}
.font-display { font-family: 'Big Shoulders Display', sans-serif; font-weight: 700; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

.app-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 8px; }
.rates-pill { display: flex; align-items: center; gap: 4px; background: var(--ink-2); color: var(--paper); border: none; border-radius: 999px; padding: 6px 10px; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.rates-pill .spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.trip-pill { margin: 0 16px 12px; display: flex; align-items: center; gap: 6px; background: var(--mango); color: var(--text-dark); border: none; border-radius: 14px; padding: 10px 14px; font-size: 13px; font-weight: 600; width: calc(100% - 32px); }

.app-main { flex: 1; background: var(--paper); border-radius: 24px 24px 0 0; padding: 16px 16px 90px; overflow-y: auto; color: var(--text-dark); }

.bottom-nav { position: absolute; bottom: 0; left: 0; right: 0; display: flex; background: var(--ink-2); padding: 8px 8px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(255,255,255,0.06); }
.nav-btn { flex: 1; background: none; border: none; color: var(--ink-soft); display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; padding: 6px 0; border-radius: 12px; }
.nav-active { color: var(--mango); }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card { background: white; border-radius: 16px; padding: 12px 14px; border: 1px solid var(--paper-dim); }
.stat-card-accent { background: var(--mango); border-color: var(--mango); }
.stat-card-accent .stat-label { color: rgba(28,43,51,0.7); }
.stat-label { font-size: 11px; color: var(--text-soft); margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 700; }

.section-block { background: white; border-radius: 16px; padding: 12px 14px; border: 1px solid var(--paper-dim); }
.section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-soft); margin-bottom: 8px; }
.row-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed var(--paper-dim); }
.row-item:last-child { border-bottom: none; }
.row-item-btn { width: 100%; background: none; border: none; align-items: center; color: var(--text-dark); }

.empty-hero { text-align: center; padding: 40px 16px; }

.order-card { background: white; border-top: 2px dashed var(--paper-dim); border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.customer-card { background: white; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; border: 1px solid var(--paper-dim); }

.badge-unpaid { background: rgba(255,107,91,0.12); color: var(--coral); font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 600; }

.stamp-row { display: flex; gap: 6px; margin-top: 10px; justify-content: space-between; }
.stamp { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px dashed var(--paper-dim); background: none; flex: 1; max-width: 34px; }
.stamp-done { background: var(--teal); border: 2px solid var(--teal); }
.stamp-active { background: var(--mango); border: 2px solid var(--mango-dark); animation: stampIn .35s ease-out; }
.stamp-future { opacity: 0.5; }
@keyframes stampIn { 0% { transform: scale(1.5) rotate(-10deg); opacity: 0; } 60% { transform: scale(0.9) rotate(5deg); } 100% { transform: scale(1) rotate(-3deg); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .stamp-active { animation: none; } .rates-pill .spin { animation: none; } }

.fab { position: fixed; bottom: 82px; right: calc(50% - 214px); width: 52px; height: 52px; border-radius: 50%; background: var(--mango); color: var(--text-dark); border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(242,168,61,0.5); }
@media (max-width: 460px) { .fab { right: 16px; } }

.chip { background: var(--paper-dim); border: none; padding: 7px 12px; border-radius: 999px; font-size: 13px; color: var(--text-dark); white-space: nowrap; }
.chip-active { background: var(--ink); color: var(--paper); }

.field-label { font-size: 12px; font-weight: 700; color: var(--text-soft); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.input { width: 100%; background: white; border: 1px solid var(--paper-dim); border-radius: 12px; padding: 10px 12px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-dark); }
.input-mono { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; }
.input-inline { display: inline-block; padding: 7px 10px; }

.preview-box { background: var(--paper-dim); border-radius: 14px; padding: 12px 14px; }

.btn-primary { background: var(--mango); color: var(--text-dark); border: none; border-radius: 14px; padding: 13px 18px; font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.btn-primary:disabled { opacity: 0.4; }
.btn-ghost { background: none; color: var(--text-dark); border: 1.5px solid var(--paper-dim); border-radius: 14px; padding: 12px 18px; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.btn-sm { padding: 8px 12px; font-size: 12px; border-radius: 10px; }
.icon-btn { background: var(--paper-dim); border: none; border-radius: 10px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.icon-btn-sm { background: var(--paper-dim); border: none; border-radius: 8px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; }

.ov-backdrop { position: fixed; inset: 0; background: rgba(15,22,27,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
.sheet-panel { width: 100%; max-width: 460px; max-height: 88vh; overflow-y: auto; background: var(--paper); border-radius: 24px 24px 0 0; padding-top: 10px; animation: sheetUp .28s ease-out; }
@keyframes sheetUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-handle { width: 36px; height: 4px; background: var(--paper-dim); border-radius: 999px; margin: 0 auto 10px; }

.search-row { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid var(--paper-dim); border-radius: 12px; padding: 9px 12px; color: var(--text-soft); }
.search-input { border: none; outline: none; background: none; flex: 1; font-size: 14px; }

.notice-box { background: var(--paper-dim); border-radius: 12px; padding: 10px 12px; font-size: 12px; color: var(--text-soft); }

.scan-drop { border: 2px dashed var(--paper-dim); border-radius: 16px; padding: 40px 16px; text-align: center; color: var(--text-soft); }
.scan-preview { max-width: 100%; max-height: 220px; border-radius: 12px; margin: 0 auto; display: block; }
.scan-item-row { display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; border: 1px solid var(--paper-dim); }

button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }
`;

// ---------------- Main App ----------------
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [trips, setTrips] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('dashboard');

  const rates = FIXED_RATES;

  const [orderModal, setOrderModal] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [showScan, setShowScan] = useState(false);
  const [showTripSheet, setShowTripSheet] = useState(false);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [summaryTripId, setSummaryTripId] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  useEffect(() => {
    (async () => {
      const t = await storage.get('trips').catch(() => null);
      const c = await storage.get('customers').catch(() => null);
      const o = await storage.get('orders').catch(() => null);
      setTrips(t ? JSON.parse(t.value) : []);
      setCustomers(c ? JSON.parse(c.value) : []);
      setOrders(o ? JSON.parse(o.value) : []);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) storage.set('trips', JSON.stringify(trips)).catch(() => {}); }, [trips, loaded]);
  useEffect(() => { if (loaded) storage.set('customers', JSON.stringify(customers)).catch(() => {}); }, [customers, loaded]);
  useEffect(() => { if (loaded) storage.set('orders', JSON.stringify(orders)).catch(() => {}); }, [orders, loaded]);

  const activeTrip = trips.find((t) => t.isActive);
  const pastTrips = trips.filter((t) => !t.isActive).sort((a, b) => b.createdAt - a.createdAt);

  function getCustomer(id) {
    return customers.find((c) => c.id === id) || { id, name: 'Pelanggan dihapus', whatsapp: '' };
  }

  const tripOrders = useMemo(() => orders.filter((o) => o.tripId === activeTrip?.id), [orders, activeTrip]);

  const stats = useMemo(() => {
    if (!activeTrip) return null;
    let revenue = 0;
    let cost = 0;
    const byCustomer = {};
    const byCategory = {};
    tripOrders.forEach((o) => {
      const { cost: c, sell: s } = orderFinance(o, rates);
      if (c !== null) {
        revenue += s;
        cost += c;
        byCustomer[o.customerId] = (byCustomer[o.customerId] || 0) + s;
      }
      byCategory[o.category] = (byCategory[o.category] || 0) + 1;
    });
    const topCustomerEntry = Object.entries(byCustomer).sort((a, b) => b[1] - a[1])[0];
    const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return {
      count: tripOrders.length,
      revenue,
      cost,
      margin: revenue - cost,
      byCustomer,
      topCustomerId: topCustomerEntry ? topCustomerEntry[0] : null,
      topCategory: topCategoryEntry ? topCategoryEntry[0] : null,
    };
  }, [tripOrders, rates, activeTrip]);

  const outstanding = useMemo(() => {
    const map = {};
    tripOrders.forEach((o) => {
      const idx = STATUSES.indexOf(o.status);
      if (idx < STATUSES.indexOf('Dibayar')) {
        const { sell } = orderFinance(o, rates);
        if (!map[o.customerId]) map[o.customerId] = 0;
        map[o.customerId] += sell || 0;
      }
    });
    return map;
  }, [tripOrders, rates]);

  function saveOrder(orderData) {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === orderData.id);
      return exists ? prev.map((o) => (o.id === orderData.id ? { ...o, ...orderData } : o)) : [...prev, { ...orderData, tripId: activeTrip.id }];
    });
    setTrips((prev) => prev.map((t) => (t.id === activeTrip.id ? { ...t, defaultMarkup: orderData.markup, defaultCurrency: orderData.currency } : t)));
    setOrderModal(null);
  }

  function quickAddCustomer(data) {
    const newC = { id: uid(), name: data.name, whatsapp: data.whatsapp || '', notes: data.notes || '', createdAt: Date.now() };
    setCustomers((prev) => [...prev, newC]);
    return newC.id;
  }

  function saveCustomer(data) {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === data.id);
      return exists ? prev.map((c) => (c.id === data.id ? data : c)) : [...prev, data];
    });
    setCustomerModal(null);
  }

  function deleteCustomer(id) { setCustomers((prev) => prev.filter((c) => c.id !== id)); }
  function deleteOrder(id) { setOrders((prev) => prev.filter((o) => o.id !== id)); }
  function updateOrderStatus(id, status) { setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o))); }

  function startNewTrip(tripData) {
    setTrips((prev) => [...prev.map((t) => (t.isActive ? { ...t, isActive: false, status: 'selesai' } : t)), tripData]);
    setShowNewTrip(false);
    setShowTripSheet(false);
  }

  if (!loaded) {
    return (
      <div className="app-outer">
        <style>{CSS}</style>
        <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ color: 'var(--paper)' }}>Muat data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-outer">
      <style>{CSS}</style>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <div className="font-display" style={{ fontSize: 26, color: 'var(--paper)', lineHeight: 1 }}>Jastip Kece</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nyatet jastip, ga pake ribet</div>
          </div>
          <div className="rates-pill">
            ¥1 = Rp109,38
          </div>
        </header>

        {activeTrip && (
          <button className="trip-pill" onClick={() => setShowTripSheet(true)}>
            <MapPin size={14} />
            <span>{activeTrip.location}</span>
            <span style={{ opacity: 0.6, fontWeight: 400 }}>· sejak {new Date(activeTrip.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
          </button>
        )}

        <main className="app-main">
          {!activeTrip && (
            <div className="empty-hero">
              <div style={{ fontSize: 40 }}>✈️🧳</div>
              <h2 className="font-display" style={{ fontSize: 24, margin: '12px 0 4px' }}>Belum ada trip aktif</h2>
              <p style={{ color: 'var(--text-soft)', marginBottom: 16 }}>Mulai trip baru buat mulai nyatet titipan pelanggan kamu.</p>
              <button className="btn-primary" onClick={() => setShowNewTrip(true)}>Mulai Trip Baru</button>
              {pastTrips.length > 0 && (
                <div className="mt-3">
                  <button className="btn-ghost" onClick={() => setShowTripSheet(true)}>Lihat Trip Sebelumnya</button>
                </div>
              )}
            </div>
          )}

          {activeTrip && tab === 'dashboard' && (
            <DashboardView stats={stats} rates={rates} customers={customers} outstanding={outstanding} onShare={() => setSummaryTripId(activeTrip.id)} onEndTrip={() => setShowNewTrip(true)} />
          )}

          {activeTrip && tab === 'orders' && (
            <OrdersView
              orders={tripOrders}
              rates={rates}
              search={orderSearch}
              setSearch={setOrderSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              getCustomer={getCustomer}
              onEdit={(o) => setOrderModal({ initial: o })}
              onDelete={deleteOrder}
              onStatusChange={updateOrderStatus}
              onAdd={() => setOrderModal({ initial: null })}
            />
          )}

          {activeTrip && tab === 'customers' && (
            <CustomersView
              customers={customers}
              orders={tripOrders}
              rates={rates}
              outstanding={outstanding}
              onEdit={(c) => setCustomerModal({ initial: c })}
              onDelete={deleteCustomer}
              onAdd={() => setCustomerModal({ initial: null })}
              trip={activeTrip}
            />
          )}
        </main>

        {activeTrip && (
          <nav className="bottom-nav">
            <button className={`nav-btn${tab === 'dashboard' ? ' nav-active' : ''}`} onClick={() => setTab('dashboard')}><Home size={20} /><span>Home</span></button>
            <button className={`nav-btn${tab === 'orders' ? ' nav-active' : ''}`} onClick={() => setTab('orders')}><Package size={20} /><span>Pesanan</span></button>
            <button className={`nav-btn${tab === 'customers' ? ' nav-active' : ''}`} onClick={() => setTab('customers')}><Users size={20} /><span>Pelanggan</span></button>
            <button className="nav-btn" onClick={() => setShowScan(true)}><Camera size={20} /><span>Scan</span></button>
          </nav>
        )}

        {orderModal && (
          <OrderFormSheet
            initial={orderModal.initial}
            customers={customers}
            trip={activeTrip}
            rates={rates}
            onCancel={() => setOrderModal(null)}
            onSave={saveOrder}
            onQuickAddCustomer={quickAddCustomer}
          />
        )}

        {customerModal && <CustomerFormSheet initial={customerModal.initial} onCancel={() => setCustomerModal(null)} onSave={saveCustomer} />}

        {showScan && (
          <ScanSheet
            onClose={() => setShowScan(false)}
            onUseResult={(prefill) => {
              setShowScan(false);
              setOrderModal({ initial: prefill ? { itemName: prefill.itemName, amount: prefill.amount, currency: prefill.currency, store: prefill.store } : null });
            }}
          />
        )}

        {showNewTrip && <TripFormSheet onCancel={() => setShowNewTrip(false)} onSave={startNewTrip} />}

        {showTripSheet && !showNewTrip && (
          <TripSheet
            activeTrip={activeTrip}
            pastTrips={pastTrips}
            onClose={() => setShowTripSheet(false)}
            onNewTrip={() => setShowNewTrip(true)}
            onViewSummary={(id) => { setShowTripSheet(false); setSummaryTripId(id); }}
          />
        )}

        {summaryTripId && (
          <SummarySheet
            trip={trips.find((t) => t.id === summaryTripId)}
            orders={orders.filter((o) => o.tripId === summaryTripId)}
            customers={customers}
            rates={rates}
            onClose={() => setSummaryTripId(null)}
          />
        )}
      </div>
    </div>
  );
}
