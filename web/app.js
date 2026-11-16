/* Local-first, dependency-free app. Can also run directly from index.html. */
(() => {
  'use strict';
  const lessons = [...window.GRAMMAR_LESSONS, ...(window.B1_LESSONS || []), ...(window.B2_LESSONS || []), ...(window.C1_LESSONS || [])];
  const theoryData = { ...(window.GRAMMAR_THEORY || {}), ...(window.B1_THEORY || {}), ...(window.B2_THEORY || {}), ...(window.C1_THEORY || {}) };
  const categories = [...new Set(lessons.map(l => l.category))];
  const vocabulary = window.VOCABULARY_DATA?.words || [];
  const vocabularyTopics = [...new Set(vocabulary.map(w => w.topic))];
  const VKEY = 'busgrammar.vocabulary.v1';
  let vocSearch = '', vocTopic = '', vocLevel = '', vocOnlySaved = false, vocShowMeaning = true;
  let vocabularyState = {saved:[],learned:[]};
  try {
    const data = JSON.parse(localStorage.getItem(VKEY) || 'null');
    if (data && typeof data === 'object') {
      const known = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => vocabulary.some(w => w.id === id)))] : [];
      vocabularyState = {saved:known(data.saved),learned:known(data.learned)};
    }
  } catch { /* Use in-memory vocabulary data when storage is unavailable. */ }
  function saveVocabulary() { try { localStorage.setItem(VKEY, JSON.stringify(vocabularyState)); } catch { toast('Không lưu được từ vựng trên thiết bị này.'); } }

  const symbols = ['Aa', '≋', '⌘', '◷', '⇄', '✧'];
  const KEY = 'busgrammar.web.v1';
  const app = document.querySelector('#app');
  const blank = () => ({ completed: [], bookmarks: [], reviews: {}, attempts: 0, correct: 0, session: null });
  let state = blank(), storageAvailable = true, duration = 5, search = '', category = '', onlySaved = false;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored && typeof stored === 'object') {
      const known = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => lessons.some(l => l.id === id)))] : [];
      state.completed = known(stored.completed); state.bookmarks = known(stored.bookmarks);
      state.attempts = Number.isSafeInteger(stored.attempts) && stored.attempts >= 0 ? stored.attempts : 0;
      state.correct = Number.isSafeInteger(stored.correct) && stored.correct >= 0 ? Math.min(stored.correct, state.attempts) : 0;
      for (const l of lessons) {
        const r = stored.reviews?.[l.id];
        if (r && Number.isFinite(r.due) && Number.isInteger(r.interval) && r.interval >= 0 && r.interval <= 30) state.reviews[l.id] = r;
      }
      const s = stored.session;
      if (s && Array.isArray(s.ids) && s.ids.length > 0 && s.ids.length <= lessons.length && s.ids.every(id => lessons.some(l => l.id === id)) && Number.isInteger(s.position) && s.position >= 0 && s.position <= s.ids.length && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.ids.length && (s.selected === null || [0,1,2].includes(s.selected)) && Array.isArray(s.orders) && s.orders.length === s.ids.length && s.orders.every((o, i) => Array.isArray(o) && o.length === lesson(s.ids[i]).questions[0].options.length && new Set(o).size === o.length && o.every(n => Number.isInteger(n) && n >= 0 && n < o.length))) state.session = s;
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { storageAvailable = false; }
  function lesson(id) { return lessons.find(l => l.id === id); }
  const e = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const due = () => lessons.filter(l => state.reviews[l.id]?.due <= Date.now());
  const active = () => state.session && state.session.position < state.session.ids.length;
  const pct = () => state.attempts ? Math.round(100 * state.correct / state.attempts) + '%' : '—';
  let toastTimer;
  function toast(message) { const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3500); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageAvailable = false; toast('Không thể lưu dữ liệu. Giữ cửa sổ này mở để tiếp tục phiên học.'); } }
  function shuffle(values) { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
  function start(count, reviewOnly = false, single = null) {
    if (active() && !window.confirm('Bắt đầu phiên mới sẽ thay thế phiên đang học. Tiếp tục?')) return;
    const overdue = due();
    const pool = single ? [lesson(single)] : reviewOnly ? overdue : [...overdue, ...lessons.filter(l => !state.reviews[l.id]), ...shuffle(lessons.filter(l => state.reviews[l.id] && !overdue.some(d => d.id === l.id)))];
    const selected = pool.slice(0, count);
    if (!selected.length) { toast('Chưa có câu đến hạn ôn.'); return; }
    state.session = { ids: selected.map(l => l.id), orders: selected.map(l => shuffle(l.questions[0].options.map((_, i) => i))), position: 0, selected: null, correct: 0 };
    save(); navigate('practice');
  }
  function navigate(route) { if (location.hash === '#' + route) render(); else location.hash = route; }
  const source = page => `./grammar-source.pdf#page=${page}`;
  const sourceLink = page => `<a class="source-link" href="${source(page)}" target="_blank" rel="noopener">↗ Tài liệu gốc: Huy Forum · trang ${page} <span class="muted">(PDF, mở tab mới)</span></a>`;
  const header = (eyebrow, title, sub) => `<div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p>`;
  const empty = (title, text) => `<div class="empty"><h2>${title}</h2><p>${text}</p><a class="secondary" href="#library">Khám phá bài học →</a></div>`;
  const routeArt = `<div class="route-art" aria-hidden="true"><svg viewBox="0 0 340 250" fill="none"><circle cx="211" cy="105" r="77" fill="#315448"/><circle cx="277" cy="50" r="15" fill="#b8be80"/><path d="M0 215Q80 151 160 201T350 191" stroke="#78956e" stroke-width="2"/><path d="M0 230Q80 166 160 216T350 206" stroke="#78956e" stroke-width="2" stroke-dasharray="6 8"/><path d="M28 167c35-63 99-86 132-49s70 9 73-37" stroke="#8ca07e" stroke-dasharray="4 6"/><circle cx="28" cy="167" r="5" fill="#dbb77d"/><g transform="translate(145 88) rotate(-7)"><rect x="0" y="0" width="129" height="93" rx="19" fill="#e0e6bb"/><rect x="10" y="13" width="108" height="45" rx="6" fill="#658771"/><path d="M46 13v45M82 13v45" stroke="#e0e6bb" stroke-width="5"/><rect x="16" y="69" width="15" height="8" rx="3" fill="#d6a46a"/><rect x="99" y="69" width="15" height="8" rx="3" fill="#d6a46a"/><circle cx="26" cy="95" r="12" fill="#102e29"/><circle cx="103" cy="95" r="12" fill="#102e29"/><circle cx="26" cy="95" r="5" fill="#98ab82"/><circle cx="103" cy="95" r="5" fill="#98ab82"/></g><path d="M75 176v-61m0 17c-26-5-31-29-31-29 28 0 31 29 31 29Zm0 19c26-5 31-29 31-29-28 0-31 29-31 29Z" stroke="#97ad83" stroke-width="3"/><path d="M298 178v-52m0 18c-19-5-21-20-21-20 21 0 21 20 21 20Z" stroke="#97ad83" stroke-width="3"/></svg><span class="hero-tag">NEXT STOP: A BETTER YOU</span></div>`;
  function home() {
    return header('A LITTLE LEARNING, EVERY DAY', 'Mỗi chuyến đi,<br>thêm một <em>chút giỏi.</em>', 'Biến vài phút trên xe thành một thói quen tốt. Hôm nay, mình học gì nhỉ?') +
      `<section class="hero"><div class="hero-copy"><div class="eyebrow">VÉ MỘT CHIỀU ĐẾN TIẾN BỘ</div><h2>Chuyến xe ngắn.<br>Kiến thức ở lại.</h2><p>Ngữ pháp tiếng Anh, giải thích bằng tiếng Việt.<br>Học nhẹ nhàng, theo nhịp của bạn.</p></div>${routeArt}</section>
      <div class="section-top"><h2>Bạn có bao nhiêu phút?</h2><span class="small-note">Không đếm ngược. Không áp lực.</span></div>
      <div class="duration-grid" role="group" aria-label="Chọn thời lượng">${[2,5,10].map((n,i) => `<button class="duration ${duration === n ? 'selected' : ''}" data-action="duration" data-value="${n}" aria-pressed="${duration === n}"><span class="duration-icon" aria-hidden="true">${['◴','◷','◶'][i]}</span><span class="radio" aria-hidden="true"></span><span class="time">${n} <small>phút</small></span><span class="description">${['Một trạm dừng nhỏ','Một chút tập trung','Một bước tiến dài'][i]}</span></button>`).join('')}</div>
      <div class="home-lower"><div><button class="primary wide" data-action="start">Bắt đầu chuyến học <span aria-hidden="true">→</span></button><p class="start-note">Khoảng ${duration} câu hỏi · Chỉ cần chạm để trả lời</p>${active() ? '<button class="secondary wide" data-action="resume">Tiếp tục phiên đang học →</button>' : ''}<div class="section-top"><h2>Hành trang ngữ pháp</h2><a class="text-link" href="#library">Tất cả →</a></div><div class="topic-grid">${categories.map((c,i) => `<a class="topic-card" href="#library/${i}"><span class="topic-icon" aria-hidden="true">${symbols[i % symbols.length]}</span><span><strong>${e(c)}</strong><small>${lessons.filter(l => l.category === c).length} bài học ngắn</small></span></a>`).join('')}</div></div>
      <aside><div class="review-card"><h3>↻ Đến lúc ôn lại</h3><span class="number">${due().length.toString().padStart(2,'0')}</span><p>${due().length ? 'Một lần gặp lại, một lần nhớ lâu hơn.' : 'Chưa có câu đến hạn. Bắt đầu một chuyến học nhé.'}</p><a class="text-link" href="#review">Mở góc ôn tập →</a></div><div class="source-panel"><span class="eyebrow">NGỮ PHÁP & TỪ VỰNG</span><p>${lessons.length} bài học, ${categories.length} chủ đề.<br>26 bài gốc theo PDF 41 trang; bài mở rộng độc lập.</p><p><a class="text-link" href="#theory">Đọc lý thuyết chi tiết →</a></p><a class="text-link" href="${source(1)}" target="_blank" rel="noopener">Mở tài liệu gốc ↗</a></div></aside></div>`;
  }
  function filteredLessons() { const term = search.toLocaleLowerCase('vi'); return lessons.filter(l => (!category || l.category === category) && (!onlySaved || state.bookmarks.includes(l.id)) && (!term || (l.title+' '+l.rule+' '+l.formula).toLocaleLowerCase('vi').includes(term))); }
  function theory() {
    const intros = ['Nhận diện chức năng của từ, chọn dạng từ và dùng mạo từ, giới từ đúng ngữ cảnh.', 'Xây dựng câu hoàn chỉnh, nối ý và đặt dấu câu rõ ràng.', 'Hiểu mệnh đề danh từ, quan hệ và trạng ngữ.', 'Chọn thì theo thời gian, kết quả và quá trình; bao quát 12 thì.', 'Tìm chủ ngữ trung tâm và xử lý các trường hợp dễ nhầm.', 'Diễn đạt giả định, chuyển điểm nhìn và dùng động từ khuyết thiếu.'];
    return header('UNDERSTAND FIRST, PRACTICE NEXT', 'Hiểu quy tắc.<br><em>Dùng được trong câu.</em>', `${lessons.length} chủ điểm · Ví dụ và lỗi thường gặp · Lộ trình B1 → B2 → C1 từ cơ bản đến nâng cao.`) +
      '<div class="theory-guide"><strong>Cách học một chủ điểm</strong><p>Đọc quy tắc → so sánh ví dụ → xem lỗi thường gặp → tự kiểm tra → bấm “Luyện bài này”. Có thể dừng ở từng mục nhỏ khi chuyến xe kết thúc.</p><span class="notice">Ký hiệu: S = chủ ngữ; V = động từ nguyên thể; V2 = quá khứ; V3 = phân từ quá khứ; N = danh từ.</span></div>' +
      `<div class="theory-toc" aria-label="Mục lục lý thuyết">${categories.map((c,i)=>`<a href="#theory/chapter-${i}">${i+1}. ${e(c)}</a>`).join('')}</div>` +
      categories.map((c,i)=>`<section class="theory-chapter" id="chapter-${i}"><div class="section-top"><h2>${i+1}. ${e(c)}</h2><span class="small-note">${lessons.filter(l=>l.category===c).length} chủ điểm</span></div><p class="notice">${intros[i] || "Lộ trình mở rộng được biên soạn độc lập và sắp xếp theo cấp độ."}</p><div class="lesson-list">${lessonRows(lessons.filter(l=>l.category===c))}</div></section>`).join('') +
      '<p class="notice">26 bài ban đầu tham khảo Huy Forum. Bài mở rộng có nguồn riêng khi đã đối chiếu; xem <a href="#sources">nguồn & ghi công</a>.</p>';
  }
  function referenceLinks(refs) {
    return refs.filter(r => /^https:\/\//.test(r.url)).map(r => `<li><a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.publisher)} · ${e(r.title)} ↗</a><p class="notice">${e(r.usage)} · Đối chiếu: ${e(r.accessed)}</p></li>`).join('');
  }
  function lessonReferences(l) {
    const refs = theoryData[l.id]?.sources || [];
    return refs.length ? `<section class="panel"><h2>Nguồn tham khảo cho bài này</h2><ul>${referenceLinks(refs)}</ul><p class="notice">Cách diễn đạt tiếng Việt, ví dụ và bài tập được biên soạn riêng. Cấp độ là gợi ý học tập, không phải chứng nhận CEFR.</p><a href="#sources">Tất cả nguồn & ghi công →</a></section>` : '';
  }
  function selfChecks(t) {
    if (!t.selfChecks?.length) return '';
    return '<section class="panel"><h3>Luyện thêm · tự đối chiếu</h3><p class="notice">Chọn trong đầu trước khi mở đáp án. Phần tự học này không ghi điểm vào tiến độ.</p>' + t.selfChecks.map((q,i) => `<div class="worked-example"><p lang="en">${i+1}. ${e(q.prompt)}</p><ol type="A">${q.options.map(o=>`<li lang="en">${e(o)}</li>`).join('')}</ol><details><summary>Xem đáp án và giải thích</summary><p><strong>${String.fromCharCode(65+q.answer)}. ${e(q.options[q.answer])}</strong></p><p>${e(q.explanation)}</p></details></div>`).join('') + '</section>';
  }
  function sourcesView() {
    const referenced = lessons.filter(l=>theoryData[l.id]?.sources?.length);
    const refs = [...new Map(referenced.flatMap(l=>theoryData[l.id].sources).map(r=>[r.url,r])).values()];
    return header('SOURCES & CREDITS', 'Nguồn học, <em>ghi công rõ ràng.</em>', 'Đọc nguồn theo từng bài; phần giải thích và bài tập mới được biên soạn bằng lời riêng.') +
      `<section class="panel"><h2>Huy Forum · bộ tài liệu ban đầu</h2><p>26 bài đầu tóm tắt hoặc chuyển thể từ PDF 41 trang của Huy Forum (THE FORUM CENTER). PDF giữ nguyên; quyền đối với tài liệu gốc thuộc về chủ sở hữu.</p>${sourceLink(1)}</section><section class="panel"><h2>British Council & Cambridge Dictionary</h2><p>Các nguồn dưới đây được dùng để đối chiếu quy tắc cho ${referenced.length} bài mới hoặc đã chỉnh sửa. Giải thích tiếng Việt, tình huống, ví dụ và câu hỏi được viết riêng; không sao chép bài tập của nguồn.</p><p class="notice">Nhãn B1/B2/C1 là lộ trình đề xuất của ứng dụng. British Council gộp nhiều chủ điểm trong B1–B2; chủ điểm có thể xuất hiện ở nhiều cấp độ. Việc dẫn nguồn không có nghĩa là các tổ chức bảo trợ ứng dụng.</p><ul>${referenceLinks(refs)}</ul></section><section class="panel"><h2>Bài có nguồn đối chiếu cụ thể</h2>${lessonRows(referenced)}</section><section class="panel"><h2>Nội dung biên soạn trước đó & từ vựng</h2><p>Các bài mở rộng chưa có mục nguồn riêng và bộ từ vựng là nội dung biên soạn trước đó. Không gán các nội dung này cho British Council hoặc Cambridge; chưa đối chiếu đầy đủ từng mục. Phiên âm Anh-Anh mang tính tham khảo.</p><p>Liên kết nguồn cần mạng; bài học, lời giải và thông tin ghi công vẫn có thể đọc ngoại tuyến sau khi ứng dụng lưu bộ nhớ đệm.</p></section>`;
  }
  function theoryContent(l) {
    const t = theoryData[l.id]; if (!t) return '';
    const renderTable = table => `<div class="theory-table-wrap" role="region" aria-label="Bảng so sánh ngữ pháp" tabindex="0"><table class="theory-table"><thead><tr>${table.headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(cell=>`<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<section class="full-theory" aria-label="Lý thuyết chi tiết"><div class="section-top"><h2>Lý thuyết chi tiết</h2><a class="text-link" href="#theory">Mục lục chủ đề →</a></div><p class="notice">Đọc từng mục theo nhịp của bạn. S = chủ ngữ; V2 = quá khứ; V3 = phân từ quá khứ.</p>${t.sections.map((s,i)=>`<section class="panel theory-section"><span class="eyebrow">MỤC ${i+1}</span><h3>${e(s.title)}</h3><p>${e(s.text)}</p>${s.bullets.length?`<ul>${s.bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul>`:''}${s.table?renderTable(s.table):''}</section>`).join('')}<section class="panel theory-section"><span class="eyebrow">HIỂU QUA VÍ DỤ</span><h3>Quan sát và giải thích</h3>${t.examples.map(([en,vi])=>`<div class="worked-example"><p lang="en">${e(en)}</p><p class="explanation">${e(vi)}</p></div>`).join('')}</section><section class="panel theory-section"><span class="eyebrow">TRÁNH LỖI QUEN THUỘC</span><h3>Sửa một câu, nhớ một quy tắc</h3>${t.mistakes.map(([wrong,right,why])=>`<div class="mistake-example"><p class="incorrect"><span>Chưa đúng</span> <span lang="en">${e(wrong)}</span></p><p class="corrected"><span>Nên dùng</span> <span lang="en">${e(right)}</span></p><p class="explanation">${e(why)}</p></div>`).join('')}</section><aside class="theory-check"><span class="eyebrow">TỰ KIỂM TRA TRƯỚC KHI LUYỆN</span><p>${e(t.check)}</p></aside><p class="notice">${t.pages.length ? `Trang tham khảo: ${t.pages.map(page=>`<a href="${source(page)}" target="_blank" rel="noopener">${page}</a>`).join(', ')} trong PDF gốc.` : "Bài bổ sung được biên soạn riêng, không trích từ PDF gốc."}</p></section>`;
  }
  function lessonRows(pool) { return pool.map(l => `<a class="lesson-row" href="#lesson/${l.id}"><span class="lesson-index">${String(lessons.indexOf(l)+1).padStart(2,'0')}</span><div><h3>${e(l.title)}</h3><small>${e(l.category)} · Lý thuyết + luyện tập · ${l.page ? `Trang ${l.page}` : `${e(l.level || "Mở rộng")} · Bài học mới`}</small></div>${state.completed.includes(l.id) ? '<span class="pill">Đã đọc</span>' : ''}<span class="arrow" aria-hidden="true">→</span></a>`).join(''); }
  function library() { return header('YOUR POCKET LIBRARY', 'Hành trang <em>ngữ pháp.</em>', 'Một ý nhỏ mỗi bài. Đọc, nghe và luyện ngay khi bạn muốn.') + `<div class="toolbar"><input id="search" class="search" type="search" placeholder="Tìm bài học, cấu trúc…" aria-label="Tìm bài học" value="${e(search)}"><select id="category" aria-label="Lọc chủ đề"><option value="">Tất cả chủ đề</option>${categories.map(c => `<option ${category===c?'selected':''}>${e(c)}</option>`).join('')}</select><label class="check-filter"><input type="checkbox" id="saved-only" ${onlySaved?'checked':''}> Bài đã lưu</label></div><div id="lesson-results" class="lesson-list">${libraryResults()}</div><p class="notice">26 bài gốc có PDF tham khảo. Các bài B1–C1 là nội dung biên soạn độc lập, không có trang PDF tương ứng.</p>`; }
  function libraryResults() { const pool = filteredLessons(); return pool.length ? lessonRows(pool) : empty('Chưa tìm thấy bài học', 'Thử từ khóa khác hoặc bỏ bộ lọc bài đã lưu.'); }
  function lessonView(id) {
    const l = lesson(id); if (!l) return empty('Không tìm thấy bài học', 'Mở thư viện để chọn một bài khác.');
    const saved = state.bookmarks.includes(id), read = state.completed.includes(id);
    return `<div class="reading"><a class="back" href="#library">← Thư viện bài học</a><div class="lesson-header"><div>${header(e(l.category)+(l.page ? ' · TRANG '+l.page : ' · '+(l.level || 'Bổ sung')), e(l.title), 'Đọc một chút, hiểu thêm một chút.')}</div><button class="bookmark" data-action="bookmark" data-id="${id}" aria-pressed="${saved}">${saved?'◆ Đã lưu':'◇ Lưu bài'}</button></div><section class="panel"><span class="eyebrow">ĐIỀU CẦN NHỚ</span><p>${e(l.rule)}</p></section><section class="panel"><span class="eyebrow">CẤU TRÚC BỎ TÚI</span><div class="formula">${e(l.formula)}</div><span class="eyebrow">THỬ TRONG MỘT CÂU</span><div class="example" lang="en">${e(l.example)}</div><button class="secondary" data-action="speak" data-id="${id}">◖)) Nghe ví dụ</button></section>${theoryContent(l)}${selfChecks(theoryData[l.id] || {})}${lessonReferences(l)}<div class="actions"><button class="secondary" data-action="complete" data-id="${id}">${read?'✓ Đã đọc bài này':'✓ Đánh dấu đã đọc'}</button><button class="primary" data-action="practice-one" data-id="${id}">Luyện bài này →</button></div>${l.page ? sourceLink(l.page) : ""}</div>`;
  }
  function review() { const pool = due(); return header('A FAMILIAR STOP', 'Gặp lại để <em>nhớ lâu.</em>', 'Câu chưa đúng sẽ trở lại sớm hơn. Câu đã nhớ được giãn lịch ôn dần.') + (pool.length ? `<div class="section-top"><h2>${pool.length} câu đang chờ bạn</h2><button class="primary" data-action="review">Ôn tối đa 10 câu →</button></div><div class="lesson-list">${lessonRows(pool)}</div>` : empty('Bạn đã bắt kịp lịch ôn!', 'Làm một phiên luyện mới, hoặc quay lại khi các câu tiếp theo đến hạn.')) + '<p class="notice">Sau câu đúng: ôn lại sau 1, 2, 4, 8, 16 rồi tối đa 30 ngày. Câu sai đến hạn ngay. Lịch ôn dựa trên giờ thiết bị.</p>'; }
  function practice() {
    const s = state.session;
    if (!s) return empty('Sẵn sàng cho chuyến học đầu tiên?', 'Chọn thời lượng ở trang Chuyến đi để bắt đầu.');
    if (!active()) return `<div class="result"><span class="result-icon" aria-hidden="true">✳</span>${header('A LITTLE FURTHER THAN BEFORE', 'Một chuyến đi <em>có ích.</em>', `Bạn trả lời đúng <strong>${s.correct}/${s.ids.length}</strong> câu.`)}<p>${storageAvailable?'Tiến độ đã lưu trên trình duyệt này.':'Tiến độ hiện chỉ giữ trong phiên này.'}<br>Câu chưa nhớ sẽ chờ bạn ở góc ôn tập.</p><div class="actions" style="justify-content:center"><a class="primary" href="#home">Về chuyến đi →</a><a class="secondary" href="#review">Xem lịch ôn</a></div></div>`;
    const l = lesson(s.ids[s.position]), q = l.questions[0], answered = s.selected !== null;
    return `<div class="practice"><div class="practice-top"><a class="back" href="#home" style="margin:0">← Tạm dừng</a><span class="eyebrow">${e(l.category)} · CÂU ${s.position+1}/${s.ids.length}</span></div><div class="meter" role="progressbar" aria-label="Tiến độ phiên học" aria-valuenow="${s.position}" aria-valuemin="0" aria-valuemax="${s.ids.length}"><div style="width:${s.position/s.ids.length*100}%"></div></div><div class="eyebrow">CHỌN CÂU TRẢ LỜI ĐÚNG</div><h1 class="question" lang="en">${e(q.prompt)}</h1><div class="answers">${s.orders[s.position].map((index,i) => `<button class="answer ${answered && index===q.answer?'correct':''} ${answered && index===s.selected && index!==q.answer?'wrong':''}" data-action="answer" data-value="${index}" ${answered?'disabled':''}><span class="letter" aria-hidden="true">${'ABC'[i]}</span><span lang="en">${e(q.options[index])}</span>${answered && index===q.answer?'<span class="result-mark">✓ <span class="sr-only">Đáp án đúng</span></span>':answered && index===s.selected?'<span class="result-mark">× <span class="sr-only">Đáp án bạn chọn chưa đúng</span></span>':''}</button>`).join('')}</div>${answered?`<section class="feedback" role="status" aria-live="polite"><h3>${s.selected===q.answer?'✓ Chính xác. Thêm một điều đã nhớ!':'✳ Chưa đúng, nhưng mình vừa học thêm.'}</h3><p>${e(q.explanation)}</p><div class="formula">${e(l.formula)}</div><a class="text-link" href="#lesson/${l.id}">Đọc lại bài học →</a></section><button class="primary wide" data-action="next">${s.position+1===s.ids.length?'Xem kết quả':'Câu tiếp theo'} →</button>`:'<p class="notice">Không cần vội. Chạm vào một đáp án khi bạn sẵn sàng.</p>'}${l.page ? sourceLink(l.page) : ""}</div>`;
  }
  function filteredVocab() {
    const term=vocSearch.trim().toLocaleLowerCase('vi');
    return vocabulary.filter(w => (!vocTopic || w.topic === vocTopic) && (!vocLevel || w.level === vocLevel) &&
      (!vocOnlySaved || vocabularyState.saved.includes(w.id)) &&
      (!term || [w.word,w.meaningVi,w.ipa,w.collocation,w.example].some(x => x.toLocaleLowerCase('vi').includes(term))));
  }
  function vocabularyRows() {
    const pool = filteredVocab();
    if (!pool.length) return '<div class="empty"><h2>Không có từ phù hợp</h2><p>Thử đổi chủ đề, cấp độ hoặc từ khóa.</p></div>';
    return pool.map(w => `<article class="vocab-card" id="${e(w.id)}"><div class="vocab-top"><span class="vocab-level">${e(w.level)} · ${e(w.topic)}</span><span>${vocabularyState.learned.includes(w.id)?'✓ Đã học':''}</span></div><h3 lang="en">${e(w.word)}</h3><div class="vocab-ipa"><span lang="en-fonipa">${e(w.ipa)}</span> <em>${e(w.partOfSpeech)}</em> <button class="secondary vocab-speak" data-action="vocab-speak" data-id="${e(w.id)}" aria-label="Phát âm ${e(w.word)}">▶ Nghe</button></div>${vocShowMeaning?`<p class="vocab-meaning">${e(w.meaningVi)}</p><p class="vocab-example" lang="en">${e(w.example)}</p><p class="vocab-collocation"><strong>Collocation:</strong> ${e(w.collocation)}</p>`:'<p class="notice">Ẩn nghĩa để tự kiểm tra. Bật “Hiện nghĩa” để xem ví dụ.</p>'}<div class="vocab-actions"><button class="secondary" data-action="vocab-save" data-id="${e(w.id)}">${vocabularyState.saved.includes(w.id)?'◆ Đã lưu':'◇ Lưu từ'}</button><button class="secondary" data-action="vocab-learn" data-id="${e(w.id)}">${vocabularyState.learned.includes(w.id)?'↺ Học lại':'✓ Đánh dấu đã học'}</button></div></article>`).join('');
  }
  function vocabularyView() {
    return header('WORDS FOR REAL LIFE', 'Từ vựng theo <em>chủ đề.</em>', `${vocabulary.length} từ · ${vocabularyTopics.length} chủ đề · B1–C1 · IPA giọng Anh-Anh tham khảo.`) +
    `<div class="stats"><div class="stat"><strong>${vocabularyState.learned.length}<span> / ${vocabulary.length}</span></strong><span>Từ đã học</span></div><div class="stat"><strong>${vocabularyState.saved.length}</strong><span>Từ đã lưu</span></div></div>` +
    `<div class="toolbar vocab-toolbar"><input id="voc-search" class="search" type="search" placeholder="Tìm từ, nghĩa, ví dụ…" value="${e(vocSearch)}" aria-label="Tìm từ vựng"><select id="voc-topic" aria-label="Chọn chủ đề"><option value="">Tất cả chủ đề</option>${vocabularyTopics.map(t=>`<option value="${e(t)}" ${vocTopic===t?'selected':''}>${e(t)}</option>`).join('')}</select><select id="voc-level" aria-label="Chọn cấp độ"><option value="">B1–C1</option>${['B1','B2','C1'].map(l=>`<option value="${l}" ${vocLevel===l?'selected':''}>${l}</option>`).join('')}</select></div><div class="vocab-controls"><label><input id="voc-saved-only" type="checkbox" ${vocOnlySaved?'checked':''}> Chỉ từ đã lưu</label><label><input id="voc-show-meaning" type="checkbox" ${vocShowMeaning?'checked':''}> Hiện nghĩa & ví dụ</label></div><div class="vocab-grid" id="vocab-results">${vocabularyRows()}</div><p class="notice">IPA: phiên âm rộng theo Anh-Anh (BrE), có khác biệt theo vùng và từ điển. Nút nghe sử dụng giọng đọc có sẵn trên trình duyệt, nên âm giọng có thể không trùng hoàn toàn với IPA. Nội dung được biên soạn độc lập, không trích từ PDF Huy Forum.</p>`;
  }
  function progress() { return header('LOOK HOW FAR YOU HAVE COME', 'Nhỏ mỗi ngày.<br><em>Lớn dần theo thời gian.</em>', 'Không cần một chuỗi ngày hoàn hảo. Mỗi lần quay lại đều có ý nghĩa.') + `<div class="stats"><div class="stat"><strong>${state.completed.length}<span> / ${lessons.length}</span></strong><span>Bài đã đọc</span></div><div class="stat"><strong>${state.attempts}</strong><span>Câu đã luyện</span></div><div class="stat"><strong>${pct()}</strong><span>Tỷ lệ trả lời đúng</span></div><div class="stat"><strong>${due().length}</strong><span>Câu đến hạn ôn</span></div></div><section class="panel"><h2>Hành trình qua ${categories.length} chủ đề</h2><div class="category-progress">${categories.map(c => { const ls=lessons.filter(l=>l.category===c), done=ls.filter(l=>state.completed.includes(l.id)).length; return `<div><label>${e(c)}<span>${done}/${ls.length} đã đọc</span></label><div class="meter"><div style="width:${done/ls.length*100}%"></div></div></div>`; }).join('')}</div></section><section class="panel"><h2>Mang theo hành trang của bạn</h2><p class="notice">Tiến độ lưu riêng trong trình duyệt này, không tự đồng bộ giữa các trình duyệt và thiết bị. Xuất bản sao để chuyển máy hoặc giữ lại trước khi xóa dữ liệu trình duyệt.</p><div class="actions"><button class="secondary" data-action="export">↓ Xuất tiến độ</button><button class="secondary" data-action="import">↑ Nhập tiến độ</button><input id="import-file" type="file" accept="application/json,.json" hidden></div></section><section class="panel"><h2>Nguồn tài liệu & mục đích sử dụng</h2><p class="notice"><strong>Nguồn: Huy Forum · British Council · Cambridge Dictionary.</strong> 26 bài gốc theo PDF Huy Forum; bài mới có nguồn đối chiếu riêng. <a href="#sources">Xem nguồn & ghi công →</a></p><h2>Học ở bất cứ đâu</h2><p class="notice">Trên Windows: chạy Start-App.cmd hoặc mở web/index.html. Trên iPhone: cần một địa chỉ HTTPS, mở bằng Safari rồi chọn Thêm vào Màn hình chính. Bản dùng trực tiếp từ file không cài bộ nhớ đệm ngoại tuyến; các tệp đã có sẵn trên máy. Khi chạy qua localhost hoặc HTTPS, ứng dụng sẽ lưu giao diện, bài học và PDF để dùng ngoại tuyến. Giọng đọc phụ thuộc giọng tiếng Anh có trên thiết bị.</p><p class="notice">26 bài gốc dựa trên tài liệu của Huy Forum (THE FORUM CENTER); các bài B1–C1 bổ sung và từ vựng được biên soạn độc lập. Một số quy tắc được làm rõ theo ngữ cảnh. PDF gốc giữ nguyên. Không tài khoản, không theo dõi, không thư viện từ mạng.</p>${sourceLink(1)}</section>`; }
  function render() {
    const [route='home', id] = location.hash.slice(1).split('/');
    if (route === 'library' && id !== undefined && categories[Number(id)]) category = categories[Number(id)];
    const views = {home,library,sources:sourcesView,theory,vocabulary:vocabularyView,review,progress,practice,lesson:()=>lessonView(id)};
    app.innerHTML = (views[route] || home)();
    const nav = route==='lesson'?'library':route==='practice'?'home':route;
    document.querySelectorAll('[data-nav]').forEach(a => { a.classList.toggle('active', a.dataset.nav===nav); if (a.dataset.nav===nav) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    document.querySelector('#due-badge').textContent = due().length;
    document.querySelector('#breadcrumb').textContent = 'Góc học nhỏ / '+({home:'Chuyến đi',library:'Thư viện',vocabulary:'Từ vựng',sources:'Nguồn & ghi công',theory:'Lý thuyết',lesson:'Bài học',review:'Ôn tập',progress:'Tiến độ',practice:'Luyện nhanh'}[route] || 'Chuyến đi');
    document.title = 'Bus Grammar · '+({home:'Chuyến đi',library:'Thư viện',vocabulary:'Từ vựng',sources:'Nguồn & ghi công',theory:'Lý thuyết',lesson:lesson(id)?.title,review:'Ôn tập',progress:'Tiến độ',practice:'Luyện nhanh'}[route] || 'Chuyến đi');
  }
  app.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const { action, id, value } = button.dataset;
    if (action==='vocab-save' || action==='vocab-learn') {
      if (!vocabulary.some(w=>w.id===id)) return;
      const key=action==='vocab-save'?'saved':'learned';
      vocabularyState[key]=vocabularyState[key].includes(id)?vocabularyState[key].filter(x=>x!==id):[...vocabularyState[key],id];
      saveVocabulary(); render();
    }
    if (action==='vocab-speak') {
      const word = vocabulary.find(w=>w.id===id); if (!word) return;
      if (!('speechSynthesis' in window)) { toast('Trình duyệt này chưa hỗ trợ giọng đọc.'); return; }
      speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang='en-GB'; utterance.rate=.85;
      utterance.onerror=()=>toast('Không phát được âm thanh. Kiểm tra giọng tiếng Anh trên thiết bị.');
      speechSynthesis.speak(utterance);
    }
    if (action==='duration') { duration=Number(value); render(); document.querySelector(`[data-action="duration"][data-value="${duration}"]`)?.focus(); }
    if (action==='start') start(duration);
    if (action==='review') start(10, true);
    if (action==='resume') navigate('practice');
    if (action==='practice-one') start(1, false, id);
    if (action==='bookmark') { state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(v=>v!==id):[...state.bookmarks,id]; save(); render(); toast(state.bookmarks.includes(id)?'Đã lưu bài vào thư viện.':'Đã bỏ lưu bài.'); }
    if (action==='complete') { if (!state.completed.includes(id)) { state.completed.push(id); save(); render(); } toast('Đã ghi nhận bài đã đọc.'); }
    if (action==='answer') {
      if (!active() || state.session.selected!==null) return;
      const s=state.session, l=lesson(s.ids[s.position]), q=l.questions[0], selected=Number(value); if (!q.options[selected]) return;
      s.selected=selected; state.attempts++;
      const good=selected===q.answer, old=state.reviews[l.id]?.interval||0, interval=good?Math.min(Math.max(1,old*2),30):0;
      if (good) { state.correct++; s.correct++; }
      state.reviews[l.id]={due:Date.now()+interval*86400000,interval}; save(); render(); document.querySelector('[data-action="next"]')?.focus({preventScroll:true});
    }
    if (action==='next') { if (!active() || state.session.selected===null) return; state.session.position++; state.session.selected=null; save(); render(); window.scrollTo(0,0); app.focus({preventScroll:true}); }
    if (action==='speak') {
      if (!('speechSynthesis' in window)) { toast('Trình duyệt này chưa hỗ trợ giọng đọc.'); return; }
      speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(lesson(id).example); utterance.lang='en-US'; utterance.rate=.85; utterance.onerror=()=>toast('Không phát được giọng đọc. Kiểm tra giọng tiếng Anh trên thiết bị.'); speechSynthesis.speak(utterance);
    }
    if (action==='export') { const blob=new Blob([JSON.stringify({format:'busgrammar.web.v1',state},null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='bus-grammar-progress.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
    if (action==='import') document.querySelector('#import-file').click();
  });
  app.addEventListener('input', event => { if (event.target.id==='search') { search=event.target.value; document.querySelector('#lesson-results').innerHTML=libraryResults(); } if (event.target.id==='voc-search') { vocSearch=event.target.value; document.querySelector('#vocab-results').innerHTML=vocabularyRows(); } });
  app.addEventListener('change', async event => {
    if (event.target.id==='voc-topic') { vocTopic=event.target.value; document.querySelector('#vocab-results').innerHTML=vocabularyRows(); }
    if (event.target.id==='voc-level') { vocLevel=event.target.value; document.querySelector('#vocab-results').innerHTML=vocabularyRows(); }
    if (event.target.id==='voc-saved-only') { vocOnlySaved=event.target.checked; document.querySelector('#vocab-results').innerHTML=vocabularyRows(); }
    if (event.target.id==='voc-show-meaning') { vocShowMeaning=event.target.checked; document.querySelector('#vocab-results').innerHTML=vocabularyRows(); }
    if (event.target.id==='category') { category=event.target.value; document.querySelector('#lesson-results').innerHTML=libraryResults(); }
    if (event.target.id==='saved-only') { onlySaved=event.target.checked; document.querySelector('#lesson-results').innerHTML=libraryResults(); }
    if (event.target.id==='import-file' && event.target.files[0]) {
      try {
        const file=event.target.files[0]; if (file.size>1000000) throw Error('File too large');
        const imported=JSON.parse(await file.text());
        const s=imported.state;
        if (imported.format!==KEY || !s || !Array.isArray(s.completed) || !Array.isArray(s.bookmarks) || !s.reviews || typeof s.reviews!=='object' || !Number.isSafeInteger(s.attempts) || !Number.isSafeInteger(s.correct) || s.attempts<0 || s.correct<0 || s.correct>s.attempts || ![...s.completed,...s.bookmarks].every(id=>lesson(id))) throw Error('Invalid format');
        for (const [id,r] of Object.entries(s.reviews)) if (!lesson(id) || !r || !Number.isFinite(r.due) || !Number.isInteger(r.interval) || r.interval<0 || r.interval>30) throw Error('Invalid review');
        if (!confirm('Nhập bản sao sẽ thay thế tiến độ trên trình duyệt này. Tiếp tục?')) return;
        state={completed:[...new Set(s.completed)],bookmarks:[...new Set(s.bookmarks)],reviews:s.reviews,attempts:s.attempts,correct:s.correct,session:null}; save(); render(); toast('Đã nhập tiến độ. Phiên học cũ đã đóng.');
      } catch { toast('Không thể nhập. Hãy chọn bản sao JSON do Bus Grammar xuất.'); }
    }
  });
  window.addEventListener('hashchange', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); render(); const chapter = location.hash.match(/^#theory\/(chapter-\d+)$/); if (chapter) document.getElementById(chapter[1])?.scrollIntoView(); else window.scrollTo(0,0); app.focus({preventScroll:true}); });
  render();
  if (!storageAvailable) toast('Trình duyệt không cho lưu dữ liệu. Tiến độ chỉ giữ trong phiên này.');
  const status=document.querySelector('#offline-status');
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    status.textContent='● Đang chuẩn bị ngoại tuyến';
    navigator.serviceWorker.register('./sw.js').then(async registration => {
      await navigator.serviceWorker.ready;
      const worker=registration.active || navigator.serviceWorker.controller;
      if (worker) worker.postMessage('CHECK_CACHE');
    }).catch(()=>{status.textContent='● Chế độ trực tuyến';});
    navigator.serviceWorker.addEventListener('message', event => { if (event.data==='OFFLINE_READY') status.textContent='● Sẵn sàng ngoại tuyến'; });
  } else { status.textContent=location.protocol==='file:'?'● Chạy từ tệp trên máy':'● Sẵn sàng học'; }
})();
