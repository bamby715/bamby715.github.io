// 图片数据：包含路径和配对的ID
const imagePairs = [
  { src: 'src/images/bamby-1.jpg', pair: 1 },
  { src: 'src/images/bamby-1.jpg', pair: 1 },
  { src: 'src/images/bamby-2.jpg', pair: 2 },
  { src: 'src/images/bamby-2.jpg', pair: 2 },
  { src: 'src/images/bamby-3.jpg', pair: 3 },
  { src: 'src/images/bamby-3.jpg', pair: 3 },
  { src: 'src/images/bamby-4.jpg', pair: 4 },
  { src: 'src/images/bamby-4.jpg', pair: 4 },
  { src: 'src/images/bamby-5.jpg', pair: 5 },
  { src: 'src/images/bamby-5.jpg', pair: 5 },
  { src: 'src/images/bamby-6.jpg', pair: 6 },
  { src: 'src/images/bamby-6.jpg', pair: 6 },
  { src: 'src/images/bamby-7.jpg', pair: 7 },
  { src: 'src/images/bamby-7.jpg', pair: 7 },
  { src: 'src/images/bamby-8.jpg', pair: 8 },
  { src: 'src/images/bamby-8.jpg', pair: 8 }
];

let gameBoard = document.getElementById('gameBoard');
let openCards = [];
let matchedPairs = 0;
let canClick = true;

// 打乱数组（Fisher-Yates算法）
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 初始化游戏板
function initGame() {
  gameBoard.innerHTML = '';
  const shuffled = shuffleArray([...imagePairs]); // 复制一份再打乱

  shuffled.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.dataset.pair = item.pair; // 存储配对ID
    card.dataset.index = index;

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = '斑比卡片';
    card.appendChild(img);

    card.addEventListener('click', handleCardClick);
    gameBoard.appendChild(card);
  });

  // 重置状态
  openCards = [];
  matchedPairs = 0;
  canClick = true;
}

// 卡片点击处理
function handleCardClick() {
  if (!canClick) return;
  if (this.classList.contains('boxMatch') || this.classList.contains('boxOpen')) return;
  if (openCards.length >= 2) return;

  this.classList.add('boxOpen');
  openCards.push(this);

  if (openCards.length === 2) {
    canClick = false;
    setTimeout(checkMatch, 600);
  }
}

// 检查配对
function checkMatch() {
  const card1 = openCards[0];
  const card2 = openCards[1];

  if (card1.dataset.pair === card2.dataset.pair) {
    // 配对成功
    card1.classList.add('boxMatch');
    card2.classList.add('boxMatch');
    matchedPairs += 2;

    /// 检查是否胜利（全部16张卡片都匹配）
  if (matchedPairs === imagePairs.length) {
    // 显示漂亮的胜利弹窗
    showVictoryModal();
  }
  } else {
    // 配对失败，翻回去
    card1.classList.remove('boxOpen');
    card2.classList.remove('boxOpen');
  }

  // 清空待开卡组
  openCards = [];
  canClick = true;
}

// 重置游戏（重新洗牌）
function resetGame() {
  initGame();
}

// 绑定重置按钮
document.getElementById('resetGameBtn').addEventListener('click', resetGame);

// 页面加载时开始
window.addEventListener('load', initGame);

// 显示胜利弹窗
function showVictoryModal() {
  const modal = document.getElementById('victoryModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// 关闭胜利弹窗
function closeVictoryModal() {
  const modal = document.getElementById('victoryModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 点击弹窗背景也可以关闭（可选）
window.addEventListener('click', function(event) {
  const modal = document.getElementById('victoryModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});