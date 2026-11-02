(function() {
  // 1. 좌측 상단 고정용 스타일 주입
  const style = document.createElement('style');
  style.innerHTML = `
    .site-footer {
      position: fixed;
      left: 20px;
      top: 16px;
      color: #475569;
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      pointer-events: none;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);

  // 2. 푸터 엘리먼트 생성 및 바디에 추가
  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerText = 'made by CuroNova';
  document.body.appendChild(footer);
})();
