function openJumpGame() {
  // 检查 THREE 是否存在
  if (typeof THREE === 'undefined') {
    console.error('THREE 未加载');
    showToast('游戏加载失败，请刷新页面重试', 3000);
    return;
  }
  
  const modal = document.getElementById('gameModal');
  const iframe = document.getElementById('gameIframe');
  
  // 隐藏 iframe
  if (iframe) iframe.style.display = 'none';
  
  // 移除旧的游戏容器（如果存在）
  const oldContainer = document.getElementById('jump-game-container');
  if (oldContainer) oldContainer.remove();
  
  // 创建新容器
  const gameContainer = document.createElement('div');
  gameContainer.id = 'jump-game-container';
  gameContainer.style.width = '100%';
  gameContainer.style.height = '100%';
  gameContainer.style.position = 'relative';
  
  const modalContent = document.querySelector('#gameModal .modal-content');
  if (!modalContent) {
    console.error('找不到模态框内容容器');
    return;
  }
  modalContent.appendChild(gameContainer);
  
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  
  // 给一点时间让模态框渲染
  setTimeout(() => {
    try {
      // 先停止旧游戏
      if (window.jumpGameInstance) {
        window.jumpGameInstance.stop();
        window.jumpGameInstance = null;
      }
      
      // 初始化新游戏
      window.jumpGameInstance = initJumpGame(gameContainer);
    } catch (error) {
      console.error('游戏初始化失败:', error);
      showToast('游戏启动失败', 3000);
    }
  }, 100);
}
