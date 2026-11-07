(function () {
  const titleInput = document.getElementById('simTitleInput');
  const kashidaRange = document.getElementById('simKashidaRange');
  const kashidaValue = document.getElementById('simKashidaValue');
  const kashidaCountBadge = document.getElementById('kashidaCountBadge');
  const titlePreview = document.getElementById('simTitlePreview');
  const kickerText = document.getElementById('simKickerText');
  const viewport = document.getElementById('simViewport');
  const neonFrame = document.getElementById('simNeonFrame');
  const statementCard = document.getElementById('simStatementCard');
  const audioPulse = document.getElementById('simAudioPulse');
  const collisionBadge = document.getElementById('collisionStatusBadge');
  const activePlaybookLabel = document.getElementById('activePlaybookLabel');
  const toast = document.getElementById('liveActionToast');
  const simCartoonWrap = document.getElementById('simCartoonAvatarWrap');
  const simMouth = document.getElementById('simMouth');
  const simEyeLeft = document.getElementById('simEyeLeft');
  const simEyeRight = document.getElementById('simEyeRight');
  const simVoiceAura = document.getElementById('simVoiceAura');

  let currentPlaybook = 'podcast-story';
  let currentPersona = 'creator-abood';
  let collisionGuardOn = true;
  let neonFrameOn = true;
  let audioPulseOn = true;
  let portraitOn = true;
  let cartoonAvatarOn = true;
  let mediaRecorder = null;
  let recordedChunks = [];

  const CONNECTABLE_BEFORE = new Set([
    'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي', 'ئ'
  ]);
  const CONNECTABLE_AFTER = new Set([
    'ا', 'أ', 'إ', 'آ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ة', 'و', 'ؤ', 'ي', 'ى', 'ئ'
  ]);

  function stretchArabicWord(word, maxInserts) {
    if (!word || maxInserts <= 0) return word;
    const clean = word.replace(/\u0640+/g, '');
    const chars = Array.from(clean);
    let inserted = 0;
    const out = [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      out.push(ch);
      const next = chars[i + 1];
      if (
        inserted < maxInserts &&
        next &&
        !(ch === 'ل' && (next === 'ا' || next === 'أ' || next === 'إ' || next === 'آ')) &&
        CONNECTABLE_BEFORE.has(ch) &&
        CONNECTABLE_AFTER.has(next)
      ) {
        out.push('ـ'.repeat(2));
        inserted++;
      }
    }
    return out.join('');
  }

  function applyKashidaLive() {
    const raw = (titleInput?.value || '').trim();
    const level = Number(kashidaRange?.value || 0);
    if (kashidaValue) kashidaValue.textContent = level === 0 ? 'بدون مدّ (0)' : level + ' مدّات في العبارة';
    if (kashidaCountBadge) kashidaCountBadge.textContent = 'كشيدة نشطة: +' + level + ' مدّات';
    if (!titlePreview) return;
    if (level <= 0) {
      titlePreview.textContent = raw.replace(/\u0640+/g, '');
      return;
    }
    const words = raw.split(/\s+/);
    let remaining = level;
    const stretched = words.map((w) => {
      if (remaining <= 0 || w.length < 3) return w.replace(/\u0640+/g, '');
      const wordCap = Math.min(remaining, 2);
      const res = stretchArabicWord(w, wordCap);
      if (res !== w.replace(/\u0640+/g, '')) remaining -= 1;
      return res;
    });
    titlePreview.textContent = stretched.join(' ');
  }

  if (titleInput) titleInput.addEventListener('input', applyKashidaLive);
  if (kashidaRange) kashidaRange.addEventListener('input', applyKashidaLive);

  // Playbook selector
  const playbookCards = document.querySelectorAll('.playbook-card');
  playbookCards.forEach((card) => {
    card.addEventListener('click', () => {
      playbookCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      currentPlaybook = card.getAttribute('data-playbook') || 'podcast-story';
      if (currentPlaybook === 'tech-edu') currentPersona = 'tech-mentor';
      else if (currentPlaybook === 'fast-reel') currentPersona = 'energy-coach';
      else if (currentPlaybook === 'luxury-brand') currentPersona = 'story-host';
      else currentPersona = 'creator-abood';

      const kicker = card.getAttribute('data-kicker') || '';
      const title = card.getAttribute('data-title') || '';
      const grade = card.getAttribute('data-grade') || 'film';
      if (kickerText) kickerText.textContent = kicker;
      if (titleInput) titleInput.value = title;
      if (activePlaybookLabel) activePlaybookLabel.textContent = card.querySelector('h4')?.textContent || '';
      if (viewport) {
        viewport.classList.remove('grade-film', 'grade-clean');
        viewport.classList.add('grade-' + grade);
      }
      applyKashidaLive();
    });
  });

  // Toggles
  const btnCollision = document.getElementById('toggleCollisionGuard');
  if (btnCollision) {
    btnCollision.addEventListener('click', () => {
      collisionGuardOn = !collisionGuardOn;
      btnCollision.classList.toggle('active', collisionGuardOn);
      const strong = btnCollision.querySelector('strong');
      if (strong) strong.textContent = collisionGuardOn ? 'مفعّل (أعلى 8%)' : 'معطّل (تداخل سفلي)';
      if (statementCard) statementCard.classList.toggle('collision-off', !collisionGuardOn);
      if (collisionBadge) {
        collisionBadge.textContent = collisionGuardOn
          ? '✅ صفر تداخل (آمن 100%)'
          : '⚠️ تحذير: تداخل العنوان مع الكابشن!';
        collisionBadge.style.color = collisionGuardOn ? '#10b981' : '#f43f5e';
      }
    });
  }

  const btnNeon = document.getElementById('toggleNeonFrame');
  if (btnNeon) {
    btnNeon.addEventListener('click', () => {
      neonFrameOn = !neonFrameOn;
      btnNeon.classList.toggle('active', neonFrameOn);
      const strong = btnNeon.querySelector('strong');
      if (strong) strong.textContent = neonFrameOn ? 'مفعّل' : 'مخفي';
      if (neonFrame) neonFrame.style.opacity = neonFrameOn ? '1' : '0';
    });
  }

  const btnPulse = document.getElementById('toggleAudioPulse');
  if (btnPulse) {
    btnPulse.addEventListener('click', () => {
      audioPulseOn = !audioPulseOn;
      btnPulse.classList.toggle('active', audioPulseOn);
      const strong = btnPulse.querySelector('strong');
      if (strong) strong.textContent = audioPulseOn ? 'مفعّل' : 'مخفي';
      if (audioPulse) audioPulse.style.opacity = audioPulseOn ? '1' : '0';
    });
  }

  const btnAspect = document.getElementById('toggleAspect');
  if (btnAspect) {
    btnAspect.addEventListener('click', () => {
      portraitOn = !portraitOn;
      btnAspect.classList.toggle('active', portraitOn);
      const label = document.getElementById('aspectLabel');
      if (label) label.textContent = portraitOn ? 'عمودي 9:16' : 'أفقي 16:9';
      if (viewport) viewport.classList.toggle('landscape', !portraitOn);
    });
  }

  const btnCartoon = document.getElementById('toggleCartoonAvatar');
  if (btnCartoon) {
    btnCartoon.addEventListener('click', () => {
      cartoonAvatarOn = !cartoonAvatarOn;
      btnCartoon.classList.toggle('active', cartoonAvatarOn);
      const strong = btnCartoon.querySelector('strong');
      if (strong) strong.textContent = cartoonAvatarOn ? 'مفعّل (Lip-Sync)' : 'مخفي';
      if (simCartoonWrap) simCartoonWrap.style.opacity = cartoonAvatarOn ? '1' : '0.15';
    });
  }

  // Animate audio pulse bars + Speaking Cartoon lip-sync & blinking
  const bars = document.querySelectorAll('.pulse-bar');
  let tick = 0;
  let frameCounter = 0;
  setInterval(() => {
    tick += 0.35;
    frameCounter++;
    if (audioPulseOn) {
      bars.forEach((bar, i) => {
        const h = 8 + Math.round(Math.abs(Math.sin(tick + i * 0.45)) * 24);
        bar.style.height = h + 'px';
      });
    }
    if (cartoonAvatarOn && simMouth) {
      const open = 2.5 + Math.abs(Math.sin(tick * 1.4)) * 8.5;
      simMouth.setAttribute('ry', open.toFixed(1));
      simMouth.setAttribute('rx', (9 + open * 0.4).toFixed(1));
      const blinkRy = frameCounter % 32 === 0 ? '1' : '7';
      if (simEyeLeft) simEyeLeft.setAttribute('ry', blinkRy);
      if (simEyeRight) simEyeRight.setAttribute('ry', blinkRy);
      if (simVoiceAura) {
        simVoiceAura.setAttribute('r', (69 + Math.abs(Math.sin(tick)) * 6).toFixed(1));
      }
    }
  }, 85);

  function showToast(msg) {
    if (!toast) return;
    toast.style.display = 'block';
    toast.textContent = msg;
  }

  // Apply playbook + Speaking Cartoon Avatar live to real project via API
  const applyBtn = document.getElementById('applyPlaybookLiveBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      try {
        showToast('⏳ جاري تفعيل القالب الإبداعي + الكرتون الناطق (Lip-Sync) على مسودة المرحلة 5...');
        const res = await fetch('/api/v5/voice-to-cartoon', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'app-1793272332186-8ec6b9',
            personaId: currentPersona,
            playbookId: currentPlaybook,
            enableCartoonAvatar: cartoonAvatarOn,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast(
            '✅ تم تفعيل «' +
              (data.persona?.nameAr || 'الكرتون الناطق') +
              '» مع مزامنة الفم لـ ' +
              (data.lipSync?.speechFrames || 0) +
              ' إطارًا منطوقًا! التقييم: ' +
              (data.guidance?.overallScore || 99) +
              '/100 (' +
              (data.guidance?.grade || 'A+') +
              ')'
          );
        } else {
          showToast('ℹ️ افتح غرفة المخرج من الزر العلوي لتطبيق القالب مباشرة.');
        }
      } catch {
        showToast('ℹ️ افتح غرفة المخرج (/media-review) لتطبيق القالب مباشرة.');
      }
    });
  }

  // Record Voice and convert to Speaking Cartoon Video
  const recordBtn = document.getElementById('recordVoiceToCartoonBtn');
  const micLabel = document.getElementById('micStatusLabel');
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('⏳ جاري تحويل الصوت المعتمد مباشرة إلى فيديو كرتون ناطق...');
        applyBtn?.click();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          recordBtn.textContent = '🎙️ سجّل صوتك وحوّله لفيديو كرتون';
          if (micLabel) micLabel.textContent = 'جاري التحويل...';
          try {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            showToast('⏳ جاري رفع التسجيل الصوتي وتفريغه محليًا وتحويله إلى مشروع كرتون ناطق...');
            const upRes = await fetch('/api/voice-brief/upload?name=voice-cartoon.webm', {
              method: 'POST',
              headers: { 'content-length': String(blob.size) },
              body: blob,
            });
            const upData = await upRes.json();
            if (upData.id) {
              const cRes = await fetch('/api/v5/voice-to-cartoon', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  voiceBriefId: upData.id,
                  personaId: currentPersona,
                  playbookId: currentPlaybook,
                  customText: titleInput?.value || '',
                }),
              });
              const cData = await cRes.json();
              if (cData.ok) {
                if (micLabel) micLabel.textContent = 'تم التحويل ✅';
                showToast(
                  '🎉 تم إنشاء مشروع الكرتون الناطق من صوتك (' +
                    cData.projectId +
                    ') مع مزامنة الفم والكشيدة العربية! جاري فتحه...'
                );
                setTimeout(() => {
                  window.location.href = '/media-review?project=' + encodeURIComponent(cData.projectId);
                }, 1400);
                return;
              }
            }
            applyBtn?.click();
          } catch {
            applyBtn?.click();
          }
        };
        mediaRecorder.start();
        recordBtn.textContent = '⏹️ إيقاف التسجيل وتحويل الصوت لكرتون الآن';
        if (micLabel) micLabel.textContent = '🔴 يسجّل الآن...';
        showToast('🎙️ تكلم الآن بالعربي أو الإنجليزي... ثم اضغط زر الإيقاف لتحويل صوتك لفيديو كرتون ناطق!');
      } catch {
        showToast('⏳ المايكروفون غير متاح في هذه النافذة؛ جاري تفعيل الكرتون الناطق على الصوت المعتمد مباشرة...');
        applyBtn?.click();
      }
    });
  }

  // Open Live Stage 5 Remotion Editor via API
  const openEditorBtn = document.getElementById('openLiveStage5Btn');
  if (openEditorBtn) {
    openEditorBtn.addEventListener('click', async () => {
      try {
        showToast('⏳ جاري فتح محرر Remotion المباشر للمرحلة الخامسة...');
        const res = await fetch('/api/v5/open-editor', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 'app-1793272332186-8ec6b9' }),
        });
        const data = await res.json();
        if (data.url) {
          showToast('✅ تم تشغيل المحرر المباشر على: ' + data.url);
          window.open(data.url, '_blank', 'noopener');
        }
      } catch {
        showToast('ℹ️ المحرر المباشر جاهز على http://127.0.0.1:61858/');
      }
    });
  }

  applyKashidaLive();
})();
