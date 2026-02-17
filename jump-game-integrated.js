(function() {
  // 防止重复加载
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
      this.mouseState = 0; // -1: 按下, 1: 抬起
      this.xspeed = 0;
      this.yspeed = 0;
      this.score = 0;
      this.animationId = null;
      this.isJumping = false; // 是否正在跳跃中
      this.isGameOver = false; // 是否游戏结束
      this.failCallback = null;
      this.cameraPos = {
        current: new THREE.Vector3(0, 0, 0),
        next: new THREE.Vector3()
      };
      
      // 检查 THREE 是否存在
      if (typeof THREE === 'undefined') {
        console.error('THREE 未定义！请检查 Three.js 是否加载成功');
        return;
      }
      console.log('THREE 版本:', THREE.REVISION);
      
      // ========== 调整后的参数 ==========
      this.config = {
        // 跳棋参数
        jumpTopRadius: 0.3,
        jumpBottomRadius: 0.5,
        jumpHeight: 2,
        jumpColor: 0xffc2d6,
        // 平台参数
        cubeX: 4,
        cubeY: 2,
        cubeZ: 4,
        cubeColor: 0xff9ebd,
        cylinderRadius: 2,
        cylinderHeight: 2,
        cylinderColor: 0xffc2d6,
        cubeMaxLen: 6,
        cubeMinDis: 2.5,  // 最小距离
        cubeMaxDis: 4,     // 最大距离
        
        // ===== 新增：蓄力速度控制 =====
        pressSpeedX: 0.001,    // 水平蓄力速度（原0.004）
        pressSpeedY: 0.002,    // 垂直蓄力速度（原0.008）
        maxSpeed: 0.15,        // 最大速度限制
        gravity: 0.008,        // 重力加速度（原0.01）
      };
      
      this.init();
    }
    
    init() {
      console.log('开始初始化游戏...');
      
      try {
        // 创建场景
        this.scene = new THREE.Scene();
        console.log('场景创建成功');
        
        // 背景色
        this.scene.background = new THREE.Color(0xfff0f5);
        
        // 获取容器尺寸
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        console.log('容器尺寸:', width, 'x', height);
        
        if (width === 0 || height === 0) {
          console.warn('容器尺寸为0，可能是模态框还没显示完全');
        }
        
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
        console.log('相机创建成功');
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        console.log('渲染器创建成功');
        
        // 灯光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
        directionalLight.position.set(3, 10, 15);
        this.scene.add(directionalLight);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        console.log('灯光添加成功');
        
        // 鼠标事件
        this.mouse = {
          down: this.isPC() ? 'mousedown' : 'touchstart',
          up: this.isPC() ? 'mouseup' : 'touchend'
        };
        this.registerEvents();
        
        // 开始生成物体
        console.log('开始创建第一个平台...');
        this.createCube();
        
        console.log('开始创建第二个平台...');
        this.createCube();
        
        console.log('开始创建跳棋...');
        this.createJumper();
        
        // 更新分数显示
        this.initScore();
        
        // 开始渲染循环
        this.animate();
        
        console.log('游戏初始化完成！');
        
      } catch (error) {
        console.error('游戏初始化失败:', error);
      }
    }
    
    // 初始化分数显示
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
    
    // 更新分数
    updateScore() {
      const scoreEl = document.getElementById('jump-game-score');
      if (scoreEl) {
        scoreEl.textContent = this.score;
      }
    }
    
    // 创建平台
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
        
        this.testPosition(mesh.position);
        this.cubes.push(mesh);
        this.scene.add(mesh);
        
        if (this.cubes.length > this.config.cubeMaxLen) {
          this.scene.remove(this.cubes.shift());
        }
        
        if (this.cubes.length > 1) {
          this.updateCameraPos();
        } else {
          this.camera.lookAt(this.cameraPos.current);
        }
        
        console.log(`平台创建成功，类型: ${cubeType}, 位置:`, mesh.position);
        
      } catch (error) {
        console.error('创建平台失败:', error);
      }
    }
    
    // 创建跳棋
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
        
        console.log('跳棋创建成功');
        
      } catch (error) {
        console.error('创建跳棋失败:', error);
      }
    }
    
    // 渲染场景
    render() {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
    
    // 更新相机位置
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
    
    // 更新相机动画
    updateCamera() {
      const self = this;
      const c = self.cameraPos.current;
      const n = self.cameraPos.next;
      
      function step() {
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
    
    // 注册事件
    registerEvents() {
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onWindowResize = this.onWindowResize.bind(this);
      
      this.renderer.domElement.addEventListener(this.mouse.down, this.onMouseDown);
      this.renderer.domElement.addEventListener(this.mouse.up, this.onMouseUp);
      window.addEventListener('resize', this.onWindowResize, false);
      
      console.log('事件注册成功');
    }
    
    // 窗口大小改变
    onWindowResize() {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.left = width / -80;
      this.camera.right = width / 80;
      this.camera.top = height / 80;
      this.camera.bottom = height / -80;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.render();
    }
    
    // 鼠标按下 - 蓄力
    onMouseDown(e) {
      e.preventDefault();
      
      // 如果正在跳跃中或游戏结束，不能再次按下
      if (this.isJumping || this.isGameOver) return;
      
      this.mouseState = -1;
      this.pressAnimation();
    }
    
    // 蓄力动画
    pressAnimation() {
      if (this.mouseState !== -1) return;
      if (!this.jumper) return;
      
      // 限制最大压缩程度
      if (this.jumper.scale.y > 0.5) {
        this.jumper.scale.y -= 0.01;
        
        // 限制最大速度
        this.xspeed = Math.min(this.xspeed + this.config.pressSpeedX, this.config.maxSpeed);
        this.yspeed = Math.min(this.yspeed + this.config.pressSpeedY, this.config.maxSpeed * 2);
        
        this.render();
        
        // 继续蓄力
        this.animationId = requestAnimationFrame(this.pressAnimation.bind(this));
      }
    }
    
    // 鼠标抬起 - 跳跃
    onMouseUp(e) {
      e.preventDefault();
      
      // 如果已经松开或者正在跳跃中，不处理
      if (this.mouseState !== -1 || this.isJumping || this.isGameOver) return;
      
      this.mouseState = 1;
      this.isJumping = true;
      
      const self = this;
      
      function jumpStep() {
        if (!self.jumper || !self.scene || self.isGameOver) {
          self.isJumping = false;
          return;
        }
        
        // 在空中时
        if (self.jumper.position.y >= self.config.jumpHeight / 2) {
          const dir = self.getDirection();
          if (dir === 'x') {
            self.jumper.position.x += self.xspeed;
          } else {
            self.jumper.position.z -= self.xspeed;
          }
          self.jumper.position.y += self.yspeed;
          
          // 重力作用
          self.yspeed -= self.config.gravity;
          
          // 恢复跳棋形状
          if (self.jumper.scale.y < 1) {
            self.jumper.scale.y += 0.02;
            if (self.jumper.scale.y > 1) self.jumper.scale.y = 1;
          }
          
          self.render();
          self.animationId = requestAnimationFrame(jumpStep);
        } else {
          // 落地判定
          self.isJumping = false;
          self.landing();
        }
      }
      
      jumpStep();
    }
    
    // 落地处理
    landing() {
      if (!this.jumper || !this.scene) return;
      
      const type = this.getJumpState();
      console.log('跳跃结果:', type);
      
      if (type === 1) {
        // 落在当前块上
        this.resetJumper();
      } else if (type === 2 || type === 3) {
        // 成功跳到下一个块
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
    
    // 重置跳棋状态
    resetJumper() {
      if (!this.jumper) return;
      
      this.xspeed = 0;
      this.yspeed = 0;
      this.jumper.scale.y = 1;
      this.jumper.position.y = this.config.jumpHeight / 2;
      this.mouseState = 0;
    }
    
    // 失败动画
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
      
      if (rotateTo) {
        this.jumper.rotation[rotateAxis] = rotateAdd;
        this.render();
        requestAnimationFrame(() => {
          this.failAnimation(state);
        });
      } else {
        // 下落动画
        this.fallDown();
      }
    }
    
    // 下落动画
    fallDown() {
      const self = this;
      
      function continueFalling() {
        if (!self.jumper || !self.scene) return;
        
        if (self.jumper.position.y >= -self.config.jumpHeight / 2) {
          self.jumper.position.y -= 0.06;
          self.render();
          requestAnimationFrame(continueFalling);
        } else {
          // 延迟重启
          setTimeout(() => {
            self.restart();
          }, 1000);
        }
      }
      
      continueFalling();
    }
    
    // 计算跳跃状态
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
    
    // 计算距离（保持原逻辑不变）
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
    
    // 获取跳跃方向
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
    
    testPosition(position) {
      if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.log('position incorrect！');
      }
    }
    
    isPC() {
      const userAgentInfo = navigator.userAgent;
      const Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
      let flag = true;
      for (let v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
          flag = false;
          break;
        }
      }
      return flag;
    }
    
    animate() {
      if (!this.scene) return; // 防止场景被清理后还渲染
      
      this.render();
      this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    restart() {
      console.log('重新开始游戏');
      
      // 重置状态
      this.isJumping = false;
      this.isGameOver = false;
      this.mouseState = 0;
      this.xspeed = 0;
      this.yspeed = 0;
      this.score = 0;
      
      // 清除所有物体
      while (this.cubes.length) {
        this.scene.remove(this.cubes.shift());
      }
      if (this.jumper) {
        this.scene.remove(this.jumper);
        this.jumper = null;
      }
      
      // 重置相机
      this.cameraPos.current.set(0, 0, 0);
      this.cameraPos.next.set(0, 0, 0);
      
      // 更新分数显示
      this.updateScore();
      
      // 重新生成
      this.createCube();
      this.createCube();
      this.createJumper();
    }
    
    stop() {
      console.log('停止游戏');
      
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.removeEventListener(this.mouse.down, this.onMouseDown);
        this.renderer.domElement.removeEventListener(this.mouse.up, this.onMouseUp);
      }
      window.removeEventListener('resize', this.onWindowResize);
      
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      if (this.renderer) {
        this.renderer.dispose();
      }
      this.scene = null;
    }
  }
  
  window.initJumpGame = function(container) {
    console.log('initJumpGame 被调用，容器:', container);
    try {
      const game = new JumpGame(container);
      return game;
    } catch (error) {
      console.error('创建游戏实例失败:', error);
      return null;
    }
  };
  
  console.log('跳一跳游戏代码加载完成');
})();
