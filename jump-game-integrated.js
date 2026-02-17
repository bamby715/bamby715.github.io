(function() {
  // 防止重复加载
  if (window.JumpGameInstance) return;
  
  class JumpGame {
    constructor(container) {
      this.container = container;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.cubes = [];
      this.jumper = null;
      this.mouseState = 0;
      this.xspeed = 0;
      this.yspeed = 0;
      this.score = 0;
      this.animationId = null;
      this.failCallback = null;
      this.cameraPos = {
        current: new THREE.Vector3(0, 0, 0),
        next: new THREE.Vector3()
      };
      
      this.config = {
        // 跳棋参数
        jumpTopRadius: 0.3,
        jumpBottomRadius: 0.5,
        jumpHeight: 2,
        jumpColor: 0xffc2d6,        // 粉色（可替换为纹理）
        // 平台参数
        cubeX: 4,
        cubeY: 2,
        cubeZ: 4,
        cubeColor: 0xff9ebd,        // 深粉色（可替换为纹理）
        cylinderRadius: 2,
        cylinderHeight: 2,
        cylinderColor: 0xffc2d6,
        cubeMaxLen: 6,
        cubeMinDis: 2.5,
        cubeMaxDis: 4
      };
      
      this.init();
    }
    
    init() {
      // 创建场景
      this.scene = new THREE.Scene();
      
      // 背景色或背景图片（假链接）
      // 素材：背景图片（可选）请替换为实际图片链接
      // const bgTexture = new THREE.TextureLoader().load('https://your-image-host.com/bamby-bg.jpg');
      // this.scene.background = bgTexture;
      this.scene.background = new THREE.Color(0xfff0f5); // 浅粉色背景
      
      // 相机
      this.camera = new THREE.OrthographicCamera(
        this.container.clientWidth / -80,
        this.container.clientWidth / 80,
        this.container.clientHeight / 80,
        this.container.clientHeight / -80,
        0.1, 5000
      );
      this.camera.position.set(100, 100, 100);
      this.cameraPos.current.set(0, 0, 0);
      this.cameraPos.next.set(0, 0, 0);
      
      // 渲染器
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.container.appendChild(this.renderer.domElement);
      
      // 灯光
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
      directionalLight.position.set(3, 10, 15);
      this.scene.add(directionalLight);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      this.scene.add(ambientLight);
      
      // 鼠标事件
      this.mouse = {
        down: this.isPC() ? 'mousedown' : 'touchstart',
        up: this.isPC() ? 'mouseup' : 'touchend'
      };
      this.registerEvents();
      
      // 开始生成物体
      this.createCube(); // 第一个平台
      this.createCube(); // 第二个平台
      this.createJumper();
      
      // 更新分数显示
      this.initScore();
      
      // 开始渲染循环
      this.animate();
    }
    
    // 初始化分数显示
    initScore() {
      // 检查是否已存在分数显示
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
          color: var(--color-primary-dark);
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          z-index: 100;
          font-family: var(--font-body);
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
    
    // 创建平台（立方体或圆柱体）- 完整版
    createCube() {
      const relativePos = Math.random() > 0.5 ? 'zDir' : 'xDir';
      const cubeType = Math.random() > 0.5 ? 'cube' : 'cylinder';
      
      let geometry, material;
      if (cubeType === 'cube') {
        geometry = new THREE.BoxGeometry(this.config.cubeX, this.config.cubeY, this.config.cubeZ);
        // 使用纹理（假链接）请替换为实际图片
        // const texture = new THREE.TextureLoader().load('https://your-image-host.com/platform-cube.jpg');
        // material = new THREE.MeshLambertMaterial({ map: texture });
        material = new THREE.MeshLambertMaterial({ color: this.config.cubeColor });
      } else {
        geometry = new THREE.CylinderGeometry(this.config.cylinderRadius, this.config.cylinderRadius, this.config.cylinderHeight, 32);
        // 使用纹理（假链接）请替换为实际图片
        // const texture = new THREE.TextureLoader().load('https://your-image-host.com/platform-cylinder.jpg');
        // material = new THREE.MeshLambertMaterial({ map: texture });
        material = new THREE.MeshLambertMaterial({ color: this.config.cylinderColor });
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 位置计算
      if (this.cubes.length) {
        const dis = this.getRandomValue(this.config.cubeMinDis, this.config.cubeMaxDis);
        const lastcube = this.cubes[this.cubes.length - 1];
        
        if (relativePos === 'zDir') {
          // Z轴方向（向后）
          if (cubeType === 'cube') {
            if (lastcube.geometry instanceof THREE.BoxGeometry) {
              // 方体 -> 方体
              mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cubeZ);
            } else {
              // 圆柱体 -> 方体
              mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius - this.config.cubeZ / 2);
            }
          } else {
            if (lastcube.geometry instanceof THREE.BoxGeometry) {
              // 方体 -> 圆柱体
              mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius - this.config.cubeZ / 2);
            } else {
              // 圆柱体 -> 圆柱体
              mesh.position.set(lastcube.position.x, lastcube.position.y, lastcube.position.z - dis - this.config.cylinderRadius * 2);
            }
          }
        } else {
          // X轴方向（向右）
          if (cubeType === 'cube') {
            if (lastcube.geometry instanceof THREE.BoxGeometry) {
              // 方体 -> 方体
              mesh.position.set(lastcube.position.x + dis + this.config.cubeX, lastcube.position.y, lastcube.position.z);
            } else {
              // 圆柱体 -> 方体
              mesh.position.set(lastcube.position.x + dis + this.config.cubeX / 2 + this.config.cylinderRadius, lastcube.position.y, lastcube.position.z);
            }
          } else {
            if (lastcube.geometry instanceof THREE.BoxGeometry) {
              // 方体 -> 圆柱体
              mesh.position.set(lastcube.position.x + dis + this.config.cylinderRadius + this.config.cubeX / 2, lastcube.position.y, lastcube.position.z);
            } else {
              // 圆柱体 -> 圆柱体
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
      
      // 如果缓存图形数大于最大缓存数，去掉一个
      if (this.cubes.length > this.config.cubeMaxLen) {
        this.scene.remove(this.cubes.shift());
      }
      
      if (this.cubes.length > 1) {
        this.updateCameraPos();
      } else {
        this.camera.lookAt(this.cameraPos.current);
      }
    }
    
    // 创建跳棋（jumper）—— 使用纹理或颜色
    createJumper() {
      const geometry = new THREE.CylinderGeometry(
        this.config.jumpTopRadius,
        this.config.jumpBottomRadius,
        this.config.jumpHeight,
        32
      );
      geometry.translate(0, this.config.jumpHeight / 2, 0);
      
      // 使用纹理（假链接）请替换为实际图片
      // const texture = new THREE.TextureLoader().load('https://your-image-host.com/bamby-jumper.png');
      // const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
      const material = new THREE.MeshLambertMaterial({ color: this.config.jumpColor });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, this.config.jumpHeight / 2, 0);
      this.jumper = mesh;
      this.scene.add(mesh);
    }
    
    // 渲染场景
    render() {
      this.renderer.render(this.scene, this.camera);
    }
    
    // 更新相机位置
    updateCameraPos() {
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
    
    // 鼠标按下
    onMouseDown() {
      this.mouseState = -1;
      if (this.jumper.scale.y > 0.02) {
        this.jumper.scale.y -= 0.01;
        this.xspeed += 0.004;
        this.yspeed += 0.008;
        this.render();
        if (this.mouseState === -1) {
          this.animationId = requestAnimationFrame(this.onMouseDown.bind(this));
        }
      }
    }
    
    // 鼠标抬起
    onMouseUp() {
      this.mouseState = 1;
      const self = this;
      
      function step() {
        if (self.jumper.position.y >= self.config.jumpHeight / 2) {
          const dir = self.getDirection();
          if (dir === 'x') {
            self.jumper.position.x += self.xspeed;
            self.jumper.position.y += self.yspeed;
          } else {
            self.jumper.position.z -= self.xspeed;
            self.jumper.position.y += self.yspeed;
          }
          self.yspeed -= 0.01;
          
          if (self.jumper.scale.y < 1) {
            self.jumper.scale.y += 0.02;
          }
          
          self.render();
          self.animationId = requestAnimationFrame(step);
        } else {
          const type = self.getJumpState();
          console.log('jumpstate:' + type);
          
          if (type === 1) {
            // 落在当前块上
            self.xspeed = 0;
            self.yspeed = 0;
            self.jumper.scale.y = 1;
            self.jumper.position.y = self.config.jumpHeight / 2;
          } else if (type === 2 || type === 3) {
            // 成功降落
            self.score += 1;
            self.xspeed = 0;
            self.yspeed = 0;
            self.jumper.scale.y = 1;
            self.jumper.position.y = self.config.jumpHeight / 2;
            self.updateScore();
            self.createCube();
          } else if (type === -2) {
            // 落到大地上动画
            (function continuefalling() {
              if (self.jumper.position.y >= -self.config.jumpHeight / 2) {
                self.jumper.position.y -= 0.06;
                self.render();
                requestAnimationFrame(continuefalling);
              }
            })();
            // 失败后延迟重启
            setTimeout(() => {
              self.restart();
            }, 1500);
          } else {
            // 落到边缘处
            self.failingAnimation(type);
            setTimeout(() => {
              self.restart();
            }, 1500);
          }
        }
      }
      
      step();
    }
    
    // 根据落点判断是否成功或失败
    getJumpState() {
      const jumpR = this.config.jumpBottomRadius;
      const vard = this.getd();
      const d = vard.d;
      const d1 = vard.d1;
      const d2 = vard.d2;
      const d3 = vard.d3;
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
    
    // 计算各个关键距离
    getd() {
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
            // -z 方向
            d = Math.abs(position.z);
            d1 = Math.abs(fromPosition.z - this.config.cubeZ / 2);
            d2 = Math.abs(toPosition.z + this.config.cubeZ / 2);
            d3 = Math.abs(toPosition.z);
            d4 = Math.abs(toPosition.z - this.config.cubeZ / 2);
          } else {
            // x 方向
            d = Math.abs(position.x);
            d1 = Math.abs(fromPosition.x + this.config.cubeX / 2);
            d2 = Math.abs(toPosition.x - this.config.cubeX / 2);
            d3 = Math.abs(toPosition.x);
            d4 = Math.abs(toPosition.x + this.config.cubeX / 2);
          }
        } else {
          if (fromPosition.x === toPosition.x) {
            // -z 方向
            d = Math.abs(position.z);
            d1 = Math.abs(fromPosition.z - this.config.cubeZ / 2);
            d2 = Math.abs(toPosition.z + this.config.cylinderRadius);
            d3 = Math.abs(toPosition.z);
            d4 = Math.abs(toPosition.z - this.config.cylinderRadius);
          } else {
            // x 方向
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
            // -z 方向
            d = Math.abs(position.z);
            d1 = Math.abs(fromPosition.z - this.config.cylinderRadius);
            d2 = Math.abs(toPosition.z + this.config.cubeZ / 2);
            d3 = Math.abs(toPosition.z);
            d4 = Math.abs(toPosition.z - this.config.cubeZ / 2);
          } else {
            // x 方向
            d = Math.abs(position.x);
            d1 = Math.abs(fromPosition.x + this.config.cylinderRadius);
            d2 = Math.abs(toPosition.x - this.config.cubeX / 2);
            d3 = Math.abs(toPosition.x);
            d4 = Math.abs(toPosition.x + this.config.cubeX / 2);
          }
        } else {
          if (fromPosition.x === toPosition.x) {
            // -z 方向
            d = Math.abs(position.z);
            d1 = Math.abs(fromPosition.z - this.config.cylinderRadius);
            d2 = Math.abs(toPosition.z + this.config.cylinderRadius);
            d3 = Math.abs(toPosition.z);
            d4 = Math.abs(toPosition.z - this.config.cylinderRadius);
          } else {
            // x 方向
            d = Math.abs(position.x);
            d1 = Math.abs(fromPosition.x + this.config.cylinderRadius);
            d2 = Math.abs(toPosition.x - this.config.cylinderRadius);
            d3 = Math.abs(toPosition.x);
            d4 = Math.abs(toPosition.x + this.config.cylinderRadius);
          }
        }
      }
      
      return {d: d, d1: d1, d2: d2, d3: d3, d4: d4};
    }
    
    // 获取跳跃方向
    getDirection() {
      let direction;
      if (this.cubes.length > 1) {
        const from = this.cubes[this.cubes.length - 2];
        const to = this.cubes[this.cubes.length - 1];
        if (from.position.z === to.position.z) direction = 'x';
        if (from.position.x === to.position.x) direction = 'z';
      }
      return direction;
    }
    
    // 失败动画
    failingAnimation(state) {
      const rotateAxis = this.getDirection() === 'z' ? 'x' : 'z';
      let rotateAdd, rotateTo;
      
      if (state === -1) {
        rotateAdd = this.jumper.rotation[rotateAxis] - 0.1;
        rotateTo = this.jumper.rotation[rotateAxis] > -Math.PI / 2;
      } else {
        rotateAdd = this.jumper.rotation[rotateAxis] + 0.1;
        rotateTo = this.jumper.rotation[rotateAxis] < Math.PI / 2;
      }
      
      if (rotateTo) {
        this.jumper.rotation[rotateAxis] = rotateAdd;
        this.render();
        requestAnimationFrame(() => {
          this.failingAnimation(state);
        });
      } else {
        const self = this;
        (function continuefalling() {
          if (self.jumper.position.y >= -self.config.jumpHeight / 2) {
            self.jumper.position.y -= 0.06;
            self.render();
            requestAnimationFrame(continuefalling);
          }
        })();
      }
    }
    
    // 生成随机数
    getRandomValue(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }
    
    // 检查位置是否有效
    testPosition(position) {
      if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.log('position incorrect！');
      }
    }
    
    // 判断是否为PC端
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
    
    // 动画循环
    animate() {
      this.render();
      this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    // 重新开始游戏
    restart() {
      // 清除现有物体
      while (this.cubes.length) {
        this.scene.remove(this.cubes.shift());
      }
      this.scene.remove(this.jumper);
      
      // 重置状态
      this.cameraPos.current.set(0, 0, 0);
      this.cameraPos.next.set(0, 0, 0);
      this.mouseState = 0;
      this.xspeed = 0;
      this.yspeed = 0;
      this.score = 0;
      this.updateScore();
      
      // 重新生成
      this.createCube();
      this.createCube();
      this.createJumper();
    }
    
    // 停止游戏（关闭模态框时调用）
    stop() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      // 移除事件监听
      this.renderer.domElement.removeEventListener(this.mouse.down, this.onMouseDown);
      this.renderer.domElement.removeEventListener(this.mouse.up, this.onMouseUp);
      window.removeEventListener('resize', this.onWindowResize);
      
      // 清空容器
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      // 清理 Three.js 资源
      this.renderer.dispose();
      this.scene = null;
    }
  }
  
  // 暴露初始化函数
  window.initJumpGame = function(container) {
    const game = new JumpGame(container);
    return game;
  };
})();