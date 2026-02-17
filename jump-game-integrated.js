// 检查落点并触发特效
checkLanding() {
  if (!this.jumper || !this.scene) return;
  
  const type = this.getJumpState();
  console.log('跳跃结果:', type, '速度:', this.currentSpeed);
  
  if (type === 1) {
    // 落在原地，触发平台压缩（当前平台）
    const currentCube = this.cubes[this.cubes.length - 1];
    this.compressPlatform(currentCube);
    this.resetJumper();
  } else if (type === 2 || type === 3) {
    // 成功跳到下一个块，判断是否为中心
    const toCube = this.cubes[this.cubes.length - 1];
    const toCenter = this.getCubeCenter(toCube);
    const jumperPos = this.jumper.position.clone();
    
    const dx = Math.abs(jumperPos.x - toCenter.x);
    const dz = Math.abs(jumperPos.z - toCenter.z);
    const distance = Math.sqrt(dx*dx + dz*dz);
    
    let addScore = 1;
    let text = '+1';
    
    // 根据平台类型计算中心阈值
    let threshold = this.config.centerThreshold;
    if (toCube.geometry instanceof THREE.BoxGeometry) {
      threshold = Math.min(this.config.cubeX, this.config.cubeZ) * 0.3;
    } else {
      threshold = this.config.cylinderRadius * 0.5;
    }
    
    if (distance < threshold) {
      addScore = 2;
      text = '+2';
    }
    
    this.score += addScore;
    this.updateScore();
    
    // 显示得分文字（在棋子旁边）
    this.showScoreLabel(text, jumperPos);
    
    // 压缩目标平台（下沉效果）
    this.compressPlatform(toCube);
    
    this.resetJumper();
    this.createCube();
  } else {
    // 失败
    this.isGameOver = true;
    this.failAnimation(type);
  }
}

// 平台下沉动画（位置下降 + 轻微缩放）
compressPlatform(platform) {
  const originalY = platform.position.y;
  const originalScale = platform.scale.clone();
  
  // 下沉参数
  const sinkAmount = 0.3;          // 下沉距离
  const compressScale = 0.8;        // 压缩比例
  const duration = 200;             // 毫秒
  
  // 第一阶段：下沉+压缩
  platform.position.y = originalY - sinkAmount;
  platform.scale.y = compressScale;
  this.render();
  
  // 第二阶段：恢复
  setTimeout(() => {
    platform.position.y = originalY;
    platform.scale.y = originalScale.y;
    this.render();
  }, duration);
}
