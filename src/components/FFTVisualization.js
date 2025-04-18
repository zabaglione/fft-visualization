import React, { useState, useEffect, useRef } from 'react';

const FFTVisualization = ({ onDataUpdate }) => {
  const [audioData, setAudioData] = useState([]);
  const [fftData, setFftData] = useState([]);
  const [processingTime, setProcessingTime] = useState({ dft: 0, fft: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [sampleSize, setSampleSize] = useState(256);
  const [signalType, setSignalType] = useState('sine');
  const [frequency, setFrequency] = useState(5);
  const [componentSignals, setComponentSignals] = useState([]);
  const [highlightedFreq, setHighlightedFreq] = useState(-1);
  
  const audioCanvasRef = useRef(null);
  const fftCanvasRef = useRef(null);
  
  // 離散フーリエ変換（DFT）の実装 - シンプルな実装
  const computeDFT = (signal) => {
    const N = signal.length;
    const result = new Array(N);
    
    const startTime = performance.now();
    
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    
    const endTime = performance.now();
    return { 
      result: result.slice(0, N/2), // ナイキスト周波数まで
      time: endTime - startTime 
    };
  };
  
  // 高速フーリエ変換（FFT）の実装 - カスタム実装（中間結果の保存付き）
  const computeFFT = (signal) => {
    const N = signal.length;
    const startTime = performance.now();
    const fftStages = []; // 各ステージの中間結果を保存
    
    // 窓関数の適用
    function applyWindowFunction(data, windowType) {
      const N = data.length;
      const result = [...data];
      
      if (windowType === 'none') return result;
      
      for (let i = 0; i < N; i++) {
        let windowFactor = 1;
        
        switch (windowType) {
          case 'hanning':
            windowFactor = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
            break;
          case 'hamming':
            windowFactor = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
            break;
          case 'blackman':
            windowFactor = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (N - 1));
            break;
          case 'rectangular':
            windowFactor = 1;
            break;
          default:
            windowFactor = 1;
        }
        
        result[i] = result[i] * windowFactor;
      }
      
      return result;
    }
    
    // 窓関数を適用した信号を取得（窓関数が指定されている場合）
    const processedSignal = windowFunction !== 'none' 
      ? applyWindowFunction(signal, windowFunction) 
      : signal;
    
    // FFTを反復的に実装（ステージごとの計算結果を保存するため）
    function fftIterative(x) {
      const N = x.length;
      const logN = Math.log2(N);
      
      if (N <= 1) {
        return x;
      }
      
      // ビットリバースによる並べ替え
      const result = new Array(N);
      for (let i = 0; i < N; i++) {
        const reversed = reverseBits(i, logN);
        result[i] = x[reversed];
      }
      
      // 各ステージのバタフライ演算
      for (let stage = 1; stage <= logN; stage++) {
        const butterflySize = 1 << stage; // 2^stage
        const halfSize = butterflySize >> 1; // butterflySize / 2
        
        // 回転因子（twiddle factor）
        for (let j = 0; j < N; j += butterflySize) {
          for (let k = 0; k < halfSize; k++) {
            const idx1 = j + k;
            const idx2 = j + k + halfSize;
            const angle = -2 * Math.PI * k / butterflySize;
            
            const tReal = Math.cos(angle) * result[idx2].real - Math.sin(angle) * result[idx2].imag;
            const tImag = Math.cos(angle) * result[idx2].imag + Math.sin(angle) * result[idx2].real;
            
            // バタフライ演算
            const tempReal = result[idx1].real;
            const tempImag = result[idx1].imag;
            
            result[idx1] = {
              real: tempReal + tReal,
              imag: tempImag + tImag
            };
            
            result[idx2] = {
              real: tempReal - tReal,
              imag: tempImag - tImag
            };
          }
        }
        
        // このステージの結果をディープコピーして保存
        fftStages.push(
          result.map(val => ({ 
            real: val.real, 
            imag: val.imag,
            magnitude: Math.sqrt(val.real * val.real + val.imag * val.imag),
            phase: Math.atan2(val.imag, val.real)
          }))
        );
      }
      
      return result;
    }
    
    // ビットリバースのヘルパー関数
    function reverseBits(n, bits) {
      let reversed = 0;
      for (let i = 0; i < bits; i++) {
        reversed = (reversed << 1) | (n & 1);
        n >>= 1;
      }
      return reversed;
    }
    
    // 信号を複素数形式に変換
    const complexSignal = processedSignal.map(val => ({ real: val, imag: 0 }));
    
    // 信号の長さが2のべき乗になるように調整
    let paddedSignal = [...complexSignal];
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(N)));
    
    if (N !== nextPowerOf2) {
      // 足りない分を0で埋める
      paddedSignal = paddedSignal.concat(
        Array(nextPowerOf2 - N).fill({ real: 0, imag: 0 })
      );
    }
    
    // 元の信号も保存（ステージ0として）
    fftStages.push(
      paddedSignal.map(val => ({ 
        real: val.real, 
        imag: val.imag,
        magnitude: Math.sqrt(val.real * val.real + val.imag * val.imag),
        phase: Math.atan2(val.imag, val.real)
      }))
    );
    
    // FFT実行
    const result = fftIterative(paddedSignal);
    
    // マグニチュード計算と位相情報
    const finalResult = result.map(val => ({
      magnitude: Math.sqrt(val.real * val.real + val.imag * val.imag),
      phase: Math.atan2(val.imag, val.real),
      real: val.real,
      imag: val.imag
    }));
    
    const endTime = performance.now();
    
    return { 
      result: finalResult.slice(0, N/2), // ナイキスト周波数まで
      time: endTime - startTime,
      stages: fftStages // 各ステージの中間結果を返す
    };
  };
  
  // 信号生成関数 - より安定した実装
  const generateSignal = () => {
    setIsGenerating(true);
    
    try {
      // サンプルサイズを確保
      const N = parseInt(sampleSize);
      if (isNaN(N) || N <= 0) {
        throw new Error("無効なサンプルサイズです");
      }
      
      // 安全な周波数値を確保
      const freq = Math.max(1, Math.min(20, parseInt(frequency)));
      
      // 信号の配列を初期化
      let signal = new Array(N).fill(0);
      // 構成信号の配列
      let components = [];
      
      // 信号タイプに基づいて配列を生成
      switch (signalType) {
        case 'sine':
          // 基本周波数の正弦波
          const sineComponent = {
            name: `正弦波 (${freq} Hz)`,
            color: '#3498db',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            sineComponent.data[i] = Math.sin(2 * Math.PI * freq * i / N);
            signal[i] = sineComponent.data[i];
          }
          
          components.push(sineComponent);
          break;
          
        case 'square':
          // 基本正弦波
          const squareBase = {
            name: `基本正弦波 (${freq} Hz)`,
            color: '#3498db',
            data: new Array(N)
          };
          
          // 実際の方形波
          const squareResult = {
            name: `方形波 (基本波の変換結果)`,
            color: '#e74c3c',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            squareBase.data[i] = Math.sin(2 * Math.PI * freq * i / N);
            squareResult.data[i] = squareBase.data[i] >= 0 ? 1 : -1;
            signal[i] = squareResult.data[i];
          }
          
          components.push(squareBase, squareResult);
          break;
          
        case 'sawtooth':
          // 基本のこぎり波
          const sawtoothComponent = {
            name: `のこぎり波 (${freq} Hz)`,
            color: '#e74c3c',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            sawtoothComponent.data[i] = 2 * ((i / N * freq) % 1) - 1;
            signal[i] = sawtoothComponent.data[i];
          }
          
          components.push(sawtoothComponent);
          break;
          
        case 'noise':
          // ノイズ成分
          const noiseComponent = {
            name: `ランダムノイズ`,
            color: '#9b59b6',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            noiseComponent.data[i] = Math.random() * 2 - 1;
            signal[i] = noiseComponent.data[i];
          }
          
          components.push(noiseComponent);
          break;
          
        case 'complex':
          // 基本周波数の正弦波
          const baseComponent = {
            name: `基本周波数 (${freq} Hz)`,
            color: '#3498db',
            data: new Array(N)
          };
          
          // 3倍周波数の正弦波
          const thirdHarmonic = {
            name: `第3倍音 (${freq * 3} Hz)`,
            color: '#e74c3c',
            data: new Array(N)
          };
          
          // 5倍周波数の正弦波
          const fifthHarmonic = {
            name: `第5倍音 (${freq * 5} Hz)`,
            color: '#2ecc71',
            data: new Array(N)
          };
          
          // 複合波形（合成結果）
          const complexResult = {
            name: '複合波形（合成結果）',
            color: '#f39c12',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            baseComponent.data[i] = Math.sin(2 * Math.PI * freq * i / N);
            thirdHarmonic.data[i] = 0.5 * Math.sin(2 * Math.PI * freq * 3 * i / N);
            fifthHarmonic.data[i] = 0.25 * Math.sin(2 * Math.PI * freq * 5 * i / N);
            
            complexResult.data[i] = baseComponent.data[i] + thirdHarmonic.data[i] + fifthHarmonic.data[i];
            signal[i] = complexResult.data[i];
          }
          
          components.push(baseComponent, thirdHarmonic, fifthHarmonic, complexResult);
          break;
          
        default:
          // デフォルトは正弦波
          const defaultComponent = {
            name: `正弦波 (${freq} Hz)`,
            color: '#3498db',
            data: new Array(N)
          };
          
          for (let i = 0; i < N; i++) {
            defaultComponent.data[i] = Math.sin(2 * Math.PI * freq * i / N);
            signal[i] = defaultComponent.data[i];
          }
          
          components.push(defaultComponent);
      }
      
      // 生成した信号と構成成分をステートに設定
      setAudioData(signal);
      setComponentSignals(components);
      
      // DFTとFFTの計算とその処理時間を測定
      // 複雑な処理を非同期で実行
      setTimeout(() => {
        try {
          const dftResult = computeDFT(signal);
          const fftResult = computeFFT(signal);
          
          const newFftData = fftResult.result;
          setFftData(newFftData);
          setProcessingTime({
            dft: dftResult.time.toFixed(2),
            fft: fftResult.time.toFixed(2)
          });
          
          // 親コンポーネントにデータを渡す（onDataUpdateが提供されている場合）
          if (typeof onDataUpdate === 'function') {
            onDataUpdate(signal, newFftData, N, fftResult.stages);
          }
          
          setIsGenerating(false);
        } catch (err) {
          console.error("変換処理中にエラーが発生しました:", err);
          setIsGenerating(false);
        }
      }, 0);
      
    } catch (err) {
      console.error("信号生成中にエラーが発生しました:", err);
      setIsGenerating(false);
    }
  };
  
  // キャンバスへの描画 - 最適化バージョン
  // 初期表示時に波形を自動生成
  useEffect(() => {
    // コンポーネントマウント時に一度だけ信号を生成
    if (audioData.length === 0) {
      generateSignal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 信号タイプまたは周波数、サンプルサイズが変更されたら自動的に信号を生成
  useEffect(() => {
    if (!isGenerating) {
      generateSignal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalType, frequency, sampleSize]);
  
  // メインビジュアル機能を強化するための追加機能
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [windowFunction, setWindowFunction] = useState('none');
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [logarithmicScale, setLogarithmicScale] = useState(false);

  useEffect(() => {
    // 時間領域信号の描画
    const drawTimeSignal = () => {
      if (!audioCanvasRef.current || audioData.length === 0) return;
      
      const canvas = audioCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // 中心線（振幅ゼロ）の描画
      ctx.beginPath();
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      
      // 構成信号を描画（最後の要素は合成波形なので省略する場合がある）
      componentSignals.forEach((component, index) => {
        // 複合波形の場合、最後の要素だけがメインの波形
        if (signalType === 'complex' && index < componentSignals.length - 1) {
          ctx.beginPath();
          ctx.strokeStyle = component.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]); // 点線
          
          const step = width / component.data.length;
          
          for (let i = 0; i < component.data.length; i++) {
            const x = i * step;
            const y = height / 2 * (1 - component.data[i]);
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.stroke();
          ctx.setLineDash([]); // 点線をリセット
        }
      });
      
      // メイン波形の描画（実線、太め）
      ctx.beginPath();
      ctx.strokeStyle = signalType === 'complex' 
        ? componentSignals[componentSignals.length - 1].color 
        : '#3498db';
      ctx.lineWidth = 2;
      
      const step = width / audioData.length;
      
      for (let i = 0; i < audioData.length; i++) {
        const x = i * step;
        const y = height / 2 * (1 - audioData[i]);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    };
    
    // 周波数領域信号の描画（強化版）
    const drawFrequencySignal = () => {
      if (!fftCanvasRef.current || fftData.length === 0) return;
      
      const canvas = fftCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // 背景にグリッド線を描画
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      
      // 水平グリッド線（振幅）
      for (let i = 0; i < 10; i++) {
        const y = height * (i / 10);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      
      // 垂直グリッド線（周波数）
      for (let i = 0; i < 10; i++) {
        const x = width * (i / 10);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();
      
      const barWidth = width / fftData.length;
      
      // 最大値を見つける（0の場合は1を使用）
      let maxMagnitude = 0;
      
      for (let i = 0; i < fftData.length; i++) {
        const magnitude = fftData[i].magnitude || fftData[i];
        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
        }
      }
      
      maxMagnitude = maxMagnitude || 1;
      
      // 対数スケールの場合の最小値（可視範囲の下限）
      const minLogValue = logarithmicScale ? 0.01 : 0;
      
      // スケール関数（線形または対数）
      const scaleValue = (value) => {
        if (logarithmicScale) {
          // 対数スケール（小さい値も見えるように）
          const minDb = -40; // -40dB = 1%
          const valueDb = 20 * Math.log10(Math.max(value / maxMagnitude, minLogValue));
          return 1 - Math.max(valueDb - minDb, 0) / Math.abs(minDb);
        } else {
          // 線形スケール
          return value / maxMagnitude;
        }
      };
      
      // マグニチュード（振幅）の描画
      for (let i = 0; i < fftData.length; i++) {
        const x = i * barWidth;
        const magnitude = fftData[i].magnitude || fftData[i];
        const scaledHeight = scaleValue(magnitude) * height;
        const barHeight = height - scaledHeight; // 下から上に描画
        
        // ハイライト効果（マウスオーバー時の色変更）
        let hue = 240 - (i / fftData.length) * 240;
        let saturation = 100;
        let lightness = 50;
        
        // ハイライト対象の周波数インデックスの場合
        if (i === highlightedFreq) {
          saturation = 100;
          lightness = 60;
        }
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fillRect(x, barHeight, Math.max(1, barWidth - 1), scaledHeight);
        
        // 位相情報の描画（オプション）
        if (showPhaseInfo && fftData[i].phase !== undefined) {
          const phase = fftData[i].phase;
          const phaseHeight = 5; // 位相マーカーの高さ
          
          // 位相を色相に変換（-π～πを0～360度に）
          const phaseHue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
          
          ctx.fillStyle = `hsl(${phaseHue}, 80%, 50%)`;
          ctx.fillRect(x, barHeight - phaseHeight, Math.max(1, barWidth - 1), phaseHeight);
        }
        
        // 周波数ラベル（基本周波数の倍数を表示）
        if (i > 0 && i % Math.floor(frequency) === 0 && i < fftData.length / 4) {
          ctx.fillStyle = '#333';
          ctx.font = '10px Arial';
          ctx.fillText(`${i}f`, x, height - 5);
        }
      }
      
      // スケール種類の表示
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(logarithmicScale ? '対数スケール' : '線形スケール', 10, 20);
      
      // 窓関数の表示（使用している場合）
      if (windowFunction !== 'none') {
        const windowName = {
          'hanning': 'ハニング窓',
          'hamming': 'ハミング窓',
          'blackman': 'ブラックマン窓',
          'rectangular': '矩形窓'
        }[windowFunction] || '';
        
        ctx.fillText(windowName, 10, 40);
      }
    };
    
    // FFTキャンバスにマウスイベントを追加
    const setupCanvasEvents = () => {
      if (!fftCanvasRef.current) return;
      
      const canvas = fftCanvasRef.current;
      const width = canvas.width;
      
      // マウス移動時の処理
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const freqIndex = Math.floor((x / width) * fftData.length);
        
        if (freqIndex >= 0 && freqIndex < fftData.length) {
          setHighlightedFreq(freqIndex);
        } else {
          setHighlightedFreq(-1);
        }
      };
      
      // マウスが離れた時の処理
      canvas.onmouseleave = () => {
        setHighlightedFreq(-1);
      };
    };
    
    // 両方の描画を実行
    drawTimeSignal();
    drawFrequencySignal();
    setupCanvasEvents();
    
    // コンポーネントアンマウント時のクリーンアップ
    return () => {
    //  if (fftCanvasRef.current) {
        //fftCanvasRef.current.onmousemove = null;
        //fftCanvasRef.current.onmouseleave = null;
    //  }
    };
    
  }, [audioData, fftData, componentSignals, highlightedFreq, frequency, signalType, logarithmicScale, showPhaseInfo, windowFunction]);
  
  // 処理時間比較のグラフ
  const renderSpeedComparison = () => {
    if (!processingTime.dft || !processingTime.fft) return null;
    
    const dftTime = parseFloat(processingTime.dft);
    const fftTime = parseFloat(processingTime.fft);
    const maxTime = Math.max(dftTime, fftTime);
    
    const dftWidth = `${(dftTime / maxTime) * 100}%`;
    const fftWidth = `${(fftTime / maxTime) * 100}%`;
    
    const speedup = dftTime / fftTime;
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">処理時間比較</h3>
        <div className="mb-2">
          <div className="flex items-center mb-1">
            <span className="w-20">DFT: </span>
            <div className="flex-1 bg-gray-300 h-6 rounded-lg overflow-hidden">
              <div
                className="bg-red-500 h-full flex items-center justify-end px-2 text-white text-sm"
                style={{ width: dftWidth }}
              >
                {processingTime.dft} ms
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="w-20">FFT: </span>
            <div className="flex-1 bg-gray-300 h-6 rounded-lg overflow-hidden">
              <div
                className="bg-green-500 h-full flex items-center justify-end px-2 text-white text-sm"
                style={{ width: fftWidth }}
              >
                {processingTime.fft} ms
              </div>
            </div>
          </div>
        </div>
        <div className="text-center font-bold mt-2">
          FFTは約 {speedup.toFixed(1)}倍 高速！
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">高速フーリエ変換 (FFT) 可視化デモ</h1>
      <p className="mb-4">
        このデモでは、従来の離散フーリエ変換(DFT)と高速フーリエ変換(FFT)の処理速度と結果を比較できます。
        FFTはO(N²)の計算量を持つDFTをO(N log N)に削減する重要なアルゴリズムです。
      </p>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 font-medium">信号タイプ</label>
          <select
            className="w-full p-2 border rounded"
            value={signalType}
            onChange={(e) => setSignalType(e.target.value)}
            disabled={isGenerating}
          >
            <option value="sine">正弦波</option>
            <option value="square">矩形波</option>
            <option value="sawtooth">のこぎり波</option>
            <option value="noise">ノイズ</option>
            <option value="complex">複合波形</option>
          </select>
        </div>
        
        <div>
          <label className="block mb-2 font-medium">サンプルサイズ</label>
          <select
            className="w-full p-2 border rounded"
            value={sampleSize}
            onChange={(e) => setSampleSize(parseInt(e.target.value))}
            disabled={isGenerating}
          >
            <option value="64">64点</option>
            <option value="128">128点</option>
            <option value="256">256点</option>
            <option value="512">512点</option>
            <option value="1024">1024点</option>
            <option value="2048">2048点</option>
            <option value="4096">4096点</option>
            <option value="8192">8192点</option>
          </select>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">基本周波数: {frequency} Hz</label>
        <input
          type="range"
          min="1"
          max="20"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          className="w-full"
          disabled={isGenerating}
        />
      </div>
      
      {/* 詳細オプション表示切り替えボタン */}
      <div className="mb-4">
        <button
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 w-full flex items-center justify-center"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          <span>詳細オプション</span>
          <svg 
            className={`ml-2 w-4 h-4 transform ${showAdvancedOptions ? 'rotate-180' : ''} transition-transform`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
      
      {/* 詳細オプションパネル */}
      {showAdvancedOptions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border animate-fade-in">
          <h3 className="text-lg font-medium mb-3">高度な表示オプション</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2">窓関数</label>
              <select
                className="w-full p-2 border rounded"
                value={windowFunction}
                onChange={(e) => setWindowFunction(e.target.value)}
                disabled={isGenerating}
              >
                <option value="none">なし</option>
                <option value="hanning">ハニング窓</option>
                <option value="hamming">ハミング窓</option>
                <option value="blackman">ブラックマン窓</option>
                <option value="rectangular">矩形窓</option>
              </select>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="phase-info"
                  checked={showPhaseInfo}
                  onChange={() => setShowPhaseInfo(!showPhaseInfo)}
                  className="mr-2"
                />
                <label htmlFor="phase-info">位相情報を表示</label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="log-scale"
                  checked={logarithmicScale}
                  onChange={() => setLogarithmicScale(!logarithmicScale)}
                  className="mr-2"
                />
                <label htmlFor="log-scale">対数スケールで表示</label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-6 w-full"
        onClick={generateSignal}
        disabled={isGenerating}
      >
        {isGenerating ? '計算中...' : '信号生成と変換開始'}
      </button>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">時間領域 (入力信号)</h2>
          <canvas
            ref={audioCanvasRef}
            width="800"
            height="200"
            className="w-full h-48 bg-white border rounded"
          />
          
          {/* 信号構成成分の凡例 */}
          {componentSignals.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded border">
              <h3 className="text-sm font-semibold mb-1">信号構成成分:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {componentSignals.map((component, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <span 
                      className="inline-block w-4 h-4 mr-2 rounded-sm" 
                      style={{ backgroundColor: component.color }}
                    ></span>
                    {component.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">周波数領域 (FFT結果)</h2>
          <canvas
            ref={fftCanvasRef}
            width="800"
            height="200"
            className="w-full h-48 bg-white border rounded"
          />
          
          {/* ハイライトされた周波数の情報表示 */}
          {highlightedFreq > 0 && highlightedFreq < fftData.length && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm">
                <strong>周波数バンド:</strong> {highlightedFreq}
                {highlightedFreq % Math.floor(frequency) === 0 && (
                  <span className="ml-2 text-blue-600">
                    (基本周波数の約 {Math.round(highlightedFreq / frequency)} 倍)
                  </span>
                )}
              </p>
              <p className="text-sm">
                <strong>振幅:</strong> {fftData[highlightedFreq] ? 
                  (typeof fftData[highlightedFreq] === 'object' ? 
                    fftData[highlightedFreq].magnitude.toFixed(4) : 
                    fftData[highlightedFreq].toFixed(4)) : 
                  '0'}
              </p>
              {showPhaseInfo && fftData[highlightedFreq] && typeof fftData[highlightedFreq] === 'object' && fftData[highlightedFreq].phase !== undefined && (
                <p className="text-sm">
                  <strong>位相:</strong> {(fftData[highlightedFreq].phase * 180 / Math.PI).toFixed(2)}°
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {renderSpeedComparison()}
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">高速フーリエ変換（FFT）とは？</h3>
        <p className="mb-2">
          フーリエ変換は信号を周波数成分に分解する数学的手法です。離散フーリエ変換（DFT）はO(N²)の計算量が必要ですが、
          高速フーリエ変換（FFT）アルゴリズムはこれをO(N log N)に削減します。
        </p>
        <p className="mb-2">
          サンプルサイズを増やすと、FFTとDFTの処理時間の差が劇的に大きくなります。サンプルサイズが{sampleSize}の場合、
          理論的計算量はDFTで{sampleSize * sampleSize}演算、FFTでわずか{Math.floor(sampleSize * Math.log2(sampleSize))}演算となります！
        </p>
        <p className="mb-2">
          音声処理、画像処理、科学計算、通信システムなど、リアルタイム処理が求められる場面でFFTは不可欠な存在です。
        </p>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-md font-semibold mb-1">使い方のヒント:</h4>
            <ul className="list-disc list-inside text-sm">
              <li className="mb-1">「複合波形」は基本周波数と高調波（倍音）の合成を表示します</li>
              <li className="mb-1">周波数バーにマウスを重ねると、周波数帯と振幅の詳細が表示されます</li>
              <li className="mb-1">サンプルサイズを大きくすると（4096点以上）、FFTの速度優位性がより明確になります</li>
              <li className="mb-1">時間領域グラフでは、信号の構成成分が色分けされて表示されます</li>
              <li className="mb-1">対数スケールを使うと、小さな振幅成分も確認できます</li>
            </ul>
          </div>
          
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <h4 className="text-md font-semibold mb-1">窓関数について:</h4>
            <p className="text-sm mb-2">
              窓関数は信号の端部の不連続性によるスペクトル漏れを軽減します。
            </p>
            <ul className="list-disc list-inside text-sm">
              <li className="mb-1">ハニング窓: バランスの取れた解析に適しています</li>
              <li className="mb-1">ハミング窓: メインローブが広く、サイドローブが抑制されます</li>
              <li className="mb-1">ブラックマン窓: サイドローブが非常に小さく、高い周波数分解能が必要な場合に有用です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FFTVisualization;
