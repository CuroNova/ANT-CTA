// 📌 UTC 시계 기능 전용 모듈/함수
function initUtcClock(selector = '[data-utc-clock]') {
  function update() {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    const timeString = `UTC ${hours}:${minutes}:${seconds}`;

    elements.forEach(el => {
      el.innerText = timeString;
    });
  }

  // 즉시 실행 및 1초 간격 갱신
  update();
  setInterval(update, 1000);
}

// 페이지가 로드되면 언제든 실행
document.addEventListener('DOMContentLoaded', () => {
  initUtcClock('[data-utc-clock]'); // 이 셀렉터를 가진 모든 요소에 시계 기능 주입
});
