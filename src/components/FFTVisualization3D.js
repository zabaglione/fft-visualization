import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const FFTVisualization3D = ({ fftData, audioData, sampleSize }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const frameIdRef = useRef(null);

  // 時間-周波数-振幅の3D表現を設定する
  useEffect(() => {
    if (!mountRef.current) return;

    let width = mountRef.current.clientWidth;
    let height = mountRef.current.clientHeight;

    // シーン、カメラ、レンダラーの設定
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;
    camera.position.y = 1;
    camera.position.x = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    
    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // OrbitControlsの設定
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    // グリッドとアクシスヘルパーの追加
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // ライティングの設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // レンダリングループの設定
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // アニメーションの開始
    animate();

    // Windowのリサイズ対応
    const handleResize = () => {
      width = mountRef.current.clientWidth;
      height = mountRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        meshRef.current.material.dispose();
      }
    };
  }, []);

  // FFTデータと音声データが変更されたら、ウォーターフォール表示をアップデート
  useEffect(() => {
    if (!sceneRef.current || !fftData || fftData.length === 0) return;

    // 前のメッシュを削除
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
    }

    // 3Dマッピングのためのジオメトリ作成
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const color = new THREE.Color();

    // FFTデータのウォーターフォール表示用のデータ構築
    const maxFreq = fftData.length / 2; // 表示する周波数の最大値（ナイキスト周波数まで）
    const maxMagnitude = Math.max(...fftData) || 1;

    // 時間軸(X)、周波数軸(Z)、振幅(Y)の三次元空間を使用
    for (let i = 0; i < audioData.length; i++) {
      // 時間領域の波形表示（左側）
      const x = (i / audioData.length) * 1.0 - 2.5;  // -2.5～-1.5の範囲にマッピング
      const y = audioData[i] * 0.5;
      const z = 0;
      
      vertices.push(x, y, z);
      
      // 青色で時間領域を表現
      color.setHSL(0.6, 1, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    // 周波数領域の表示（右側）
    for (let i = 0; i < maxFreq; i++) {
      const x = 0.5;  // X軸位置は固定
      const y = (fftData[i] / maxMagnitude) * 1.0; // 正規化された振幅
      const z = (i / maxFreq) * 2.0 - 1.0;  // Z軸を周波数に対応（-1～1の範囲）
      
      vertices.push(x, y, z);
      
      // 周波数に応じた色のグラデーション（低周波は赤、高周波は紫）
      color.setHSL(i / maxFreq * 0.8, 1, 0.5);
      colors.push(color.r, color.g, color.b);
    }

    // 教育目的：FFTの段階的変換を表示（中央部分）
    // 複数のステップを示すバタフライ図の視覚化
    const logN = Math.log2(fftData.length);
    for (let stage = 0; stage < logN; stage++) {
      const stepSize = Math.pow(2, stage);
      
      for (let i = 0; i < fftData.length / 2; i += stepSize) {
        // バタフライ演算の視覚化のための点
        const x = -1.0 + stage * 0.5;  // ステージごとに右に移動
        const y = (i / (fftData.length / 2)) * 1.0 - 0.5;
        const z = 0.5;
        
        vertices.push(x, y, z);
        
        // ステージごとに異なる色
        color.setHSL(stage / logN, 0.8, 0.5);
        colors.push(color.r, color.g, color.b);
        
        // バタフライパターンの結合線
        const yTarget = ((i + stepSize) / (fftData.length / 2)) * 1.0 - 0.5;
        
        vertices.push(x, yTarget, z);
        colors.push(color.r, color.g, color.b);
      }
    }

    // ジオメトリの頂点とカラーを設定
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // マテリアル設定
    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      sizeAttenuation: true
    });

    // ポイントクラウドとライン表示の作成
    const points = new THREE.Points(geometry, material);
    
    // ラインマテリアル
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x444444,
      vertexColors: true,
      opacity: 0.7,
      transparent: true
    });
    
    // 時間領域を線で接続
    const timeLineIndices = [];
    for (let i = 0; i < audioData.length - 1; i++) {
      timeLineIndices.push(i, i + 1);
    }
    
    if (timeLineIndices.length > 0) {
      geometry.setIndex(timeLineIndices);
      const lines = new THREE.LineSegments(geometry, lineMaterial);
      sceneRef.current.add(lines);
    }
    
    sceneRef.current.add(points);
    meshRef.current = points;

    // ラベル表示用のテキスト（Three.jsではHTML要素をオーバーレイするのが一般的）
    const div = document.createElement('div');
    div.className = 'axis-labels';
    div.style.position = 'absolute';
    div.style.left = '10px';
    div.style.bottom = '10px';
    div.style.color = 'black';
    div.innerHTML = `
      <div>X軸: 時間 / 変換ステージ</div>
      <div>Y軸: 振幅</div>
      <div>Z軸: 周波数</div>
      <div>サンプルサイズ: ${sampleSize}</div>
    `;
    
    if (mountRef.current.querySelector('.axis-labels')) {
      mountRef.current.removeChild(mountRef.current.querySelector('.axis-labels'));
    }
    mountRef.current.appendChild(div);

  }, [fftData, audioData, sampleSize]);

  return (
    <div className="relative">
      <div 
        ref={mountRef} 
        className="w-full h-96 bg-gray-100 rounded-lg shadow-inner"
        style={{ minHeight: '400px' }}
      />
      <div className="absolute bottom-3 right-3 bg-white bg-opacity-70 p-2 rounded text-xs">
        <p>マウスドラッグ: 回転</p>
        <p>スクロール: ズーム</p>
        <p>右クリックドラッグ: 移動</p>
      </div>
    </div>
  );
};

export default FFTVisualization3D;