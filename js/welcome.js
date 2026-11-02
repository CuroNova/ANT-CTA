window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('progressBar').style.width = '100%';
  }, 50);
});

// 2초 후 로그인 페이지로 자동 이동
setTimeout(() => {
  window.location.href = '/login';
}, 2000);
