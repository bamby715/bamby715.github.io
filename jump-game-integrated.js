(function() {
  if (window.JumpGameInstance) {
    console.log('游戏实例已存在');
    return;
  }
  
  console.log('开始加载跳一跳游戏...');
  
  class JumpGame {
    constructor(container) {
      console.log('游戏构造函数被调用，容器:', container);
      
      if (!container) {
        console.error('容器不存在！');
        return;
      }
      
      this.container = container;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.cubes = [];
      this.jumper = null;
      
      // 跳跃状态
      this.isPressing = false;
      this.isJumping = false;
      this.isGameOver = false;
      
      // 速度参数
      this.pressStartTime = 0;
      this.pressProgress = 0;
      this.currentSpeed = 0;      // 水平速度（基准60fps下的每帧速度）
      this.currentVSpeed = 0;      // 垂直速度（基准60fps下的每帧速度）
      
      // 时间相关
      this.lastJumpTime = 0;       // 上一帧跳跃时间戳
      
      // 分数
      this.score = 0;
      
      // 相机
      this.cameraPos = {
        current: new THREE.Vector3(0, 0, 0),
        next: new THREE.Vector3()
      };
      
      this.animationId = null;
      
      if (typeof THREE === 'undefined') {
        console.error('THREE 未定义！');
        return;
      }
      
      // ========== 优化后的参数 ==========
      this.config = {
        // 跳棋
        jumpTopRadius: 0.3,
        jumpBottomRadius: 0.5,
        jumpHeight: 2,
        jumpColor: 0xffc2d6,
        
        // 平台
        cubeX: 4,
        cubeY: 2,
        cubeZ: 4,
        cubeColor: 0xff9ebd,
        cylinderRadius: 2,
        cylinderHeight: 2,
        cylinderColor: 0xffc2d6,
        
        cubeMaxLen: 6,
        cubeMinDis: 2.5,
        cubeMaxDis: 4,
        
        // 跳跃参数（关键调整）
        minSpeed: 0.03,          // 最小水平速度（60fps下每帧）
        maxSpeed: 0.12,          // 最大水平速度
        pressDuration: 600,       // 蓄力到最大所需毫秒（0.6秒即可压到底）
        gravity: 0.006,           // 重力（60fps下每帧速度衰减）
        verticalFactor: 3.2,      // 垂直初速度 = 水平速度 * 这个系数（跳得更高更远）
      };
      
      this.init();
    }
    
    init() {
      console.log('开始初始化游戏...');
      
      try {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfff0f5);
        
        // 获取容器尺寸
        const width = this.container.clientWidth || 600;
        const height = this.container.clientHeight || 400;
        
        // 相机
        this.camera = new THREE.OrthographicCamera(
          width / -80,
          width / 80,
          height / 80,
          height / -80,
          0.1, 5000
        );
        this.camera.position.set(100, 100, 100);
        this.cameraPos.current.set(0, 0, 0);
        this.cameraPos.next.set(0, 0, 0);
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // 灯光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
        directionalLight.position.set(3, 10, 15);
        this.scene.add(directionalLight);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        // 注册事件
        this.registerEvents();
        
        // 开始生成物体
        this.createCube(); // 第一个平台
        this.createCube(); // 第二个平台
        this.createJumper();
        
        // 分数显示
        this.initScore();
        
        // 开始渲染循环
        this.animate();
        
        console.log('游戏初始化完成！');
        
      } catch (error) {
        console.error('游戏初始化失败:', error);
      }
    }
    
    initScore() {
      let scoreEl = document.getElementById('jump-game-score');
      if (!scoreEl) {
        scoreEl = document.createElement('div');
        scoreEl.id = 'jump-game-score';
        scoreEl.style.cssText = `
          position: absolute;
          top: 20px;
          left: 20px;
          font-size: 24px;
          font-weight: bold;
          color: #ff9ebd;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          z-index: 100;
          font-family: 'Noto Sans SC', sans-serif;
        `;
        this.container.appendChild(scoreEl);
      }
      scoreEl.textContent = '0';
    }
    
    updateScore() {
      const scoreEl = document.getElementById('jump-game-score');
      if (scoreEl) scoreEl.textContent = this.score;
    }
    
    // 创建平台（与原来相同）
    createCube() {
      try {
        const relativePos = Math.random() > 0.5 ? 'zDir' : 'xDir';
        const cubeType = Math.random() > 0.5 ? 'cube' : 'cylinder';
        
        let geometry, material;
        if (cubeType === 'cube') {
          geometry = new THREE.BoxGeometry(this.config.cubeX, this.config.cubeY, this.config.cubeZ);
          material = new THREE.MeshLambertMaterial({ color: this.config.cubeColor });
        } else {
          geometry = new THREE.CylinderGeometry(this.config.cylinderRadius, this.config.cylinderRadius, this.config.cylinderHeight, 32);
          material = new THREE.MeshLambertMaterial({ color: this.config.cylinderColor });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        
        if (this.cubes.length) {
          const dis = this.getRandomValue(this.config.cubeMinDis, this.config.cubeMaxDis);
          const lastcube = this.cubes[this.cubes.length - 1];
          
          if (relativePos === 'zDir') {
            if (cubeType === 'cube') {
              if (lastcube.geometry instanceof THREE.BoxGeometry) {
                mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cubeZ);
              } else {
                mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius - this.config.cubeZ / 2);
              }
            } else {
              if (lastcube.geometry instanceof THREE.BoxGeometry) {
                mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius - this.config.cubeZ / 2);
              } else {
                mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius * 2);
              }
            }
          } else {
            if (cubeType === 'cube') {
              if (lastcube.geometry instanceof THREE.BoxGeometry) {
                mesh.position.set(lastcube.position.x + dis + this.config.cubeX, lastcube.position.y, lastcube.position.z);
              } else {
                mesh.position.set(lastcube.position.x + dis + this.config.cubeX / 2 + this.config.cylinderRadius, lastcube.position.y, lastcube.position.z);
              }
            } else {
              if (lastcube.geometry instanceof THREE.BoxGeometry) {
                mesh.position.set(lastcube.position.x + dis + this.config.cylinderRadius + this.config.cubeX / 2, lastcube.position.y, lastcube.position.z);
              } else {
                mesh.position.set(lastcube.position.x + dis + this.config.cylinderRadius * 2, lastcube.position.y, lastcube.position.z);
              }
            }
          }
        } else {
          mesh.position.set(0, 0, 0);
        }
        
        this.cubes.push(mesh);
        this.scene.add(mesh);
        
        if (this.cubes.length > this.config.cubeMaxLen) {
          const removed = this.cubes.shift();
          if (removed) this.scene.remove(removed);
        }
        
        if (this.cubes.length > 1) {
          this.updateCameraPos();
        } else {
          this.camera.lookAt(this.cameraPos.current);
        }
        
      } catch (error) {
        console.error('创建平台失败:', error);
      }
    }
    
    createJumper() {
      try {
        const geometry = new THREE.CylinderGeometry(
          this.config.jumpTopRadius,
          this.config.jumpBottomRadius,
          this.config.jumpHeight,
          32
        );
        geometry.translate(0, this.config.jumpHeight / 2, 0);
        
        const material = new THREE.MeshLambertMaterial({ color: this.config.jumpColor });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, this.config.jumpHeight / 2, 0);
        this.jumper = mesh;
        this.scene.add(mesh);
        
      } catch (error) {
        console.error('创建跳棋失败:', error);
      }
    }
    
    render() {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
    
    updateCameraPos() {
      if (this.cubes.length < 2) return;
      
      const a = this.cubes[this.cubes.length - 2];
      const b = this.cubes[this.cubes.length - 1];
      const toPos = {
        x: (a.position.x + b.position.x) / 2,
        y: 0,
        z: (a.position.z + b.position.z) / 2
      };
      this.cameraPos.next = new THREE.Vector3(toPos.x, toPos.y, toPos.z);
      this.updateCamera();
    }
    
    updateCamera() {
      const self = this;
      const c = self.cameraPos.current;
      const n = self.cameraPos.next;
      
      function step() {
        if (!self.scene) return;
        
        if (c.x < n.x || c.z > n.z) {
          if (c.x < n.x) c.x += 0.1;
          if (c.z > n.z) c.z -= 0.1;
          if (Math.abs(c.x - n.x) < 0.05) c.x = n.x;
          if (Math.abs(c.z - n.z) < 0.05) c.z = n.z;
          self.camera.lookAt(new THREE.Vector3(c.x, 0, c.z));
          self.render();
          requestAnimationFrame(step);
        }
      }
      step();
    }
    
    registerEvents() {
      this.onTouchStart = this.onTouchStart.bind(this);
      this.onTouchEnd = this.onTouchEnd.bind(this);
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onWindowResize = this.onWindowResize.bind(this);
      
      const canvas = this.renderer.domElement;
      
      canvas.addEventListener('mousedown', this.onMouseDown);
      canvas.addEventListener('mouseup', this.onMouseUp);
      canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
      canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
      
      window.addEventListener('resize', this.onWindowResize, false);
    }
    
    onWindowResize() {
      if (!this.container || !this.camera || !this.renderer) return;
      
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width > 0 && height > 0) {
        this.camera.left = width / -80;
        this.camera.right = width / 80;
        this.camera.top = height / 80;
        this.camera.bottom = height / -80;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.render();
      }
    }
    
    onMouseDown(e) {
      e.preventDefault();
      if (this.isJumping || this.isGameOver || !this.jumper) return;
      
      this.isPressing = true;
      this.pressStartTime = performance.now();
      this.pressProgress = 0;
      this.currentSpeed = this.config.minSpeed;
      
      this.pressAnimation();
    }
    
    onTouchStart(e) {
      e.preventDefault();
      if (this.isJumping || this.isGameOver || !this.jumper) return;
      
      this.isPressing = true;
      this.pressStartTime = performance.now();
      this.pressProgress = 0;
      this.currentSpeed = this.config.minSpeed;
      
      this.pressAnimation();
    }
    
    pressAnimation() {
      if (!this.isPressing || !this.jumper) return;
      
      const pressDuration = performance.now() - this.pressStartTime;
      this.pressProgress = Math.min(1, pressDuration / this.config.pressDuration);
      
      // 速度线性增长
      this.currentSpeed = this.config.minSpeed + 
        (this.config.maxSpeed - this.config.minSpeed) * this.pressProgress;
      
      // 跳棋压缩：进度越大压得越扁（最大压缩到0.3）
      const scale = 1 - this.pressProgress * 0.7;
      this.jumper.scale.y = scale;
      
      this.render();
      
      this.animationId = requestAnimationFrame(this.pressAnimation.bind(this));
    }
    
    onMouseUp(e) {
      e.preventDefault();
      this.endPress();
    }
    
    onTouchEnd(e) {
      e.preventDefault();
      this.endPress();
    }
    
    endPress() {
      if (!this.isPressing || !this.jumper) return;
      
      this.isPressing = false;
      this.isJumping = true;
      
      // 垂直初速度 = 水平速度 * 系数
      this.currentVSpeed = this.currentSpeed * this.config.verticalFactor;
      
      // 恢复跳棋形状
      if (this.jumper) {
        this.jumper.scale.y = 1;
      }
      
      // 记录跳跃起始时间
      this.lastJumpTime = performance.now();
      
      // 开始跳跃（传入当前时间戳）
      this.jumpAnimation(performance.now());
    }
    
    // 基于时间差的跳跃动画
    jumpAnimation(timestamp) {
      if (!this.jumper || !this.scene || this.isGameOver) {
        this.isJumping = false;
        return;
      }
      
      // 计算时间差（相对于上一帧），单位是相对于60fps的帧数比例
      if (!this.lastJumpTime) this.lastJumpTime = timestamp;
      const delta = (timestamp - this.lastJumpTime) * 60 / 1000; // 60fps为标准
      this.lastJumpTime = timestamp;
      
      // 限制最大delta，防止卡顿时跳得太远
      const safeDelta = Math.min(delta, 2.0);
      
      const dir = this.getDirection();
      
      // 水平移动
      if (dir === 'x') {
        this.jumper.position.x += this.currentSpeed * safeDelta;
      } else {
        this.jumper.position.z -= this.currentSpeed * safeDelta;
      }
      
      // 垂直移动
      this.jumper.position.y += this.currentVSpeed * safeDelta;
      this.currentVSpeed -= this.config.gravity * safeDelta;
      
      this.render();
      
      // 判断是否落地
      if (this.jumper.position.y <= this.config.jumpHeight / 2) {
        this.jumper.position.y = this.config.jumpHeight / 2;
        this.isJumping = false;
        this.checkLanding();
      } else {
        this.animationId = requestAnimationFrame((t) => this.jumpAnimation(t));
      }
    }
    
    checkLanding() {
      if (!this.jumper || !this.scene) return;
      
      const type = this.getJumpState();
      console.log('跳跃结果:', type, '速度:', this.currentSpeed);
      
      if (type === 1) {
        // 落在原地
        this.resetJumper();
      } else if (type === 2 || type === 3) {
        // 成功跳到下一个
        this.score += 1;
        this.updateScore();
        this.resetJumper();
        this.createCube();
      } else {
        // 失败
        this.isGameOver = true;
        this.failAnimation(type);
      }
    }
    
    resetJumper() {
      if (!this.jumper) return;
      
      this.currentSpeed = 0;
      this.currentVSpeed = 0;
      this.pressProgress = 0;
      this.jumper.position.y = this.config.jumpHeight / 2;
      this.jumper.scale.y = 1;
      this.isJumping = false;
      this.isGameOver = false;
    }
    
    failAnimation(state) {
      if (!this.jumper) return;
      
      const rotateAxis = this.getDirection() === 'z' ? 'x' : 'z';
      let rotateAdd, rotateTo;
      
      if (state === -1) {
        rotateAdd = this.jumper.rotation[rotateAxis] - 0.05;
        rotateTo = this.jumper.rotation[rotateAxis] > -Math.PI / 2;
      } else {
        rotateAdd = this.jumper.rotation[rotateAxis] + 0.05;
        rotateTo = this.jumper.rotation[rotateAxis] < Math.PI / 2;
      }
      
      if (rotateTo && this.jumper) {
        this.jumper.rotation[rotateAxis] = rotateAdd;
        this.render();
        requestAnimationFrame(() => {
          this.failAnimation(state);
        });
      } else {
        this.fallDown();
      }
    }
    
    fallDown() {
      const self = this;
      
      function continueFalling() {
        if (!self.jumper || !self.scene) return;
        
        if (self.jumper.position.y >= -self.config.jumpHeight / 2) {
          self.jumper.position.y -= 0.06;
          self.render();
          requestAnimationFrame(continueFalling);
        } else {
          setTimeout(() => {
            self.restart();
          }, 1000);
        }
      }
      
      continueFalling();
    }
    
    // 以下 getJumpState, getd, getDirection, getRandomValue 与之前相同
    getJumpState() {
      if (this.cubes.length < 2 || !this.jumper) return 1;
      
      const jumpR = this.config.jumpBottomRadius;
      const vard = this.getd();
      if (!vard) return 1;
      
      const d = vard.d;
      const d1 = vard.d1;
      const d2 = vard.d2;
      const d4 = vard.d4;
      
      if (d <= d1) {
        return 1;
      } else if (d > d1 && Math.abs(d - d1) <= jumpR) {
        return -1;
      } else if (Math.abs(d - d1) > jumpR && d < d2 && Math.abs(d - d2) >= jumpR) {
        return -2;
      } else if (d < d2 && Math.abs(d - d2) < jumpR) {
        return -3;
      } else if (d > d2 && d <= d4) {
        return 2;
      } else if (d > d4 && Math.abs(d - d4) < jumpR) {
        return -1;
      } else {
        return -2;
      }
    }
    
    getd() {
      if (this.cubes.length < 2 || !this.jumper) return null;
      
      try {
        let d, d1, d2, d3, d4;
        const fromObj = this.cubes[this.cubes.length - 2];
        const fromPosition = fromObj.position;
        const fromType = fromObj.geometry instanceof THREE.BoxGeometry ? 'cube' : 'cylinder';
        const toObj = this.cubes[this.cubes.length - 1];
        const toPosition = toObj.position;
        const toType = toObj.geometry instanceof THREE.BoxGeometry ? 'cube' : 'cylinder';
        const position = this.jumper.position;
        
        if (fromType === 'cube') {
          if (toType === 'cube') {
            if (fromPosition.x === toPosition.x) {
              d = Math.abs(position.z);
              d1 = Math.abs(fromPosition.z - this.config.cubeZ / 2);
              d2 = Math.abs(toPosition.z + this.config.cubeZ / 2);
              d3 = Math.abs(toPosition.z);
              d4 = Math.abs(toPosition.z - this.config.cubeZ / 2);
            } else {
              d = Math.abs(position.x);
              d1 = Math.abs(fromPosition.x + this.config.cubeX / 2);
              d2 = Math.abs(toPosition.x - this.config.cubeX / 2);
              d3 = Math.abs(toPosition.x);
              d4 = Math.abs(toPosition.x + this.config.cubeX / 2);
            }
          } else {
            if (fromPosition.x === toPosition.x) {
              d = Math.abs(position.z);
              d1 = Math.abs(fromPosition.z - this.config.cubeZ / 2);
              d2 = Math.abs(toPosition.z + this.config.cylinderRadius);
              d3 = Math.abs(toPosition.z);
              d4 = Math.abs(toPosition.z - this.config.cylinderRadius);
            } else {
              d = Math.abs(position.x);
              d1 = Math.abs(fromPosition.x + this.config.cubeX / 2);
              d2 = Math.abs(toPosition.x - this.config.cylinderRadius);
              d3 = Math.abs(toPosition.x);
              d4 = Math.abs(toPosition.x + this.config.cylinderRadius);
            }
          }
        } else {
          if (toType === 'cube') {
            if (fromPosition.x === toPosition.x) {
              d = Math.abs(position.z);
              d1 = Math.abs(fromPosition.z - this.config.cylinderRadius);
              d2 = Math.abs(toPosition.z + this.config.cubeZ / 2);
              d3 = Math.abs(toPosition.z);
              d4 = Math.abs(toPosition.z - this.config.cubeZ / 2);
            } else {
              d = Math.abs(position.x);
              d1 = Math.abs(fromPosition.x + this.config.cylinderRadius);
              d2 = Math.abs(toPosition.x - this.config.cubeX / 2);
              d3 = Math.abs(toPosition.x);
              d4 = Math.abs(toPosition.x + this.config.cubeX / 2);
            }
          } else {
            if (fromPosition.x === toPosition.x) {
              d = Math.abs(position.z);
              d1 = Math.abs(fromPosition.z - this.config.cylinderRadius);
              d2 = Math.abs(toPosition.z + this.config.cylinderRadius);
              d3 = Math.abs(toPosition.z);
              d4 = Math.abs(toPosition.z - this.config.cylinderRadius);
            } else {
              d = Math.abs(position.x);
              d1 = Math.abs(fromPosition.x + this.config.cylinderRadius);
              d2 = Math.abs(toPosition.x - this.config.cylinderRadius);
              d3 = Math.abs(toPosition.x);
              d4 = Math.abs(toPosition.x + this.config.cylinderRadius);
            }
          }
        }
        
        return {d: d, d1: d1, d2: d2, d3: d3, d4: d4};
        
      } catch (error) {
        console.error('计算距离失败:', error);
        return null;
      }
    }
    
    getDirection() {
      if (this.cubes.length < 2) return 'x';
      
      const from = this.cubes[this.cubes.length - 2];
      const to = this.cubes[this.cubes.length - 1];
      if (from.position.z === to.position.z) return 'x';
      if (from.position.x === to.position.x) return 'z';
      return 'x';
    }
    
    getRandomValue(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }
    
    animate() {
      if (!this.scene) return;
      this.render();
      this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    restart() {
      console.log('重新开始游戏');
      
      this.isPressing = false;
      this.isJumping = false;
      this.isGameOver = false;
      
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      if (this.scene) {
        while (this.cubes.length > 0) {
          const cube = this.cubes.shift();
          if (cube) this.scene.remove(cube);
        }
        
        if (this.jumper) {
          this.scene.remove(this.jumper);
          this.jumper = null;
        }
      }
      
      this.cubes = [];
      this.currentSpeed = 0;
      this.currentVSpeed = 0;
      this.pressProgress = 0;
      this.score = 0;
      
      if (this.cameraPos) {
        this.cameraPos.current.set(0, 0, 0);
        this.cameraPos.next.set(0, 0, 0);
      }
      
      this.updateScore();
      
      if (this.scene) {
        this.createCube();
        this.createCube();
        this.createJumper();
      }
      
      this.animate();
    }
    
    stop() {
      console.log('停止游戏');
      
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
        this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
        this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
        this.renderer.domElement.removeEventListener('touchend', this.onTouchEnd);
      }
      window.removeEventListener('resize', this.onWindowResize);
      
      if (this.container) {
        while (this.container.firstChild) {
          this.container.removeChild(this.container.firstChild);
        }
      }
      
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }
      
      this.scene = null;
    }
  }
  
  window.initJumpGame = function(container) {
    console.log('initJumpGame 被调用，容器:', container);
    try {
      if (window.jumpGameInstance) {
        window.jumpGameInstance.stop();
        window.jumpGameInstance = null;
      }
      
      const game = new JumpGame(container);
      window.jumpGameInstance = game;
      return game;
    } catch (error) {
      console.error('创建游戏实例失败:', error);
      return null;
    }
  };
  
  console.log('跳一跳游戏代码加载完成');
})();
