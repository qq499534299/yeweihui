(function () {
  'use strict';

  // --- 背景音乐控制 ---
  var bgm = document.getElementById('bgm');
  var musicBtn = document.getElementById('music-btn');
  var musicPlaying = false;

  musicBtn.addEventListener('click', function () {
    if (musicPlaying) {
      bgm.pause();
      musicBtn.textContent = '🎵';
      musicBtn.classList.remove('playing');
      musicPlaying = false;
    } else {
      bgm.play().then(function () {
        musicBtn.textContent = '🎶';
        musicBtn.classList.add('playing');
        musicPlaying = true;
      }).catch(function () {
        // 微信等浏览器需要用户交互后才能播放
        musicBtn.textContent = '🔇';
        setTimeout(function () {
          musicBtn.textContent = '🎵';
        }, 1500);
      });
    }
  });

  // --- 表单提交 ---
  var form = document.getElementById('signup-form');
  var submitBtn = document.getElementById('submit-btn');
  var btnText = submitBtn.querySelector('.btn-text');
  var btnLoading = submitBtn.querySelector('.btn-loading');
  var formSuccess = document.getElementById('form-success');
  var formError = document.getElementById('form-error');
  var formFields = form.querySelectorAll('.form-group, .submit-btn');

  // Phone validation
  function isValidPhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
  }

  // Show error briefly
  function showError() {
    formError.style.display = 'block';
    setTimeout(function () {
      formError.style.display = 'none';
    }, 5000);
  }

  // Reset form
  function resetForm() {
    form.reset();
  }

  // Set loading state
  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
    } else {
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Hide previous messages
    formSuccess.style.display = 'none';
    formError.style.display = 'none';

    // Get values
    var name = document.getElementById('name').value.trim();
    var building = document.getElementById('building').value.trim();
    var unit = document.getElementById('unit').value.trim();
    var room = document.getElementById('room').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var willingnessEl = document.querySelector('input[name="willingness"]:checked');

    // Validate
    if (!name) {
      alert('请输入姓名');
      return;
    }
    if (!unit) {
      alert('请输入单元号');
      return;
    }
    if (!room) {
      alert('请输入门牌号');
      return;
    }
    if (!phone) {
      alert('请输入手机号码');
      return;
    }
    if (!isValidPhone(phone)) {
      alert('请输入正确的11位手机号码');
      return;
    }
    if (!willingnessEl) {
      alert('请选择您的参与意愿');
      return;
    }

    var willingness = willingnessEl.value;
    var willingnessLabel = willingnessEl.parentNode.querySelector('.radio-label').textContent.trim();
    var buildingFull = building ? 'C区' + building : 'C区';
    var fullAddress = building
      ? buildingFull + '栋-' + unit + '单元-' + room
      : buildingFull + '-' + unit + '单元-' + room;

    // Build payload
    var payload = {
      name: name,
      building: buildingFull,
      unit: unit,
      room: room,
      address: fullAddress,
      phone: phone,
      willingness: willingness,
      willingnessLabel: willingnessLabel,
      submittedAt: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    };

    // Submit
    setLoading(true);

    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        setLoading(false);

        if (result.ok && result.data.success) {
          // Success
          formFields.forEach(function (el) {
            el.style.display = 'none';
          });
          formSuccess.style.display = 'block';
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          showError();
        }
      })
      .catch(function () {
        setLoading(false);
        showError();
      });
  });
})();
