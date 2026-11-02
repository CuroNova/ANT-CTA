(function() {
  // 1. 푸터용 스타일 주입 (fixed 제거 -> 일반 블록 레이아웃 또는 적절한 하단 배치)
  const style = document.createElement('style');
  style.innerHTML = `
    .site-footer {
      width: 100%;
      text-align: right;
      padding: 16px 20px;
      color: #475569;
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      box-sizing: border-box;
      margin-top: auto; /* flex 컨테이너 안에서 맨 아래로 밀어내기 */
    }
  `;
  document.head.appendChild(style);

  // 2. 푸터 엘리먼트 생성
  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerText = 'made by CuroNova';

  // 3. 페이지 body가 flex 구조이거나 맨 아래에 자연스럽게 붙도록 처리
  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(footer);
  });
})();
