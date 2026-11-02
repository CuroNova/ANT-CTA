// js/header.js (전역 공통 헤더 메타/파비콘 주입)
(function() {
  const head = document.head || document.getElementsByTagName('head')[0];

  // 파비콘 태그 생성
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = '/images/favicon.ico'; // 준비하신 파비콘 경로
  favicon.type = 'image/x-icon';

  // head에 추가
  head.appendChild(favicon);
})();
