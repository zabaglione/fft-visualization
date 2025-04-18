import React, { useState, useEffect, useRef } from 'react';

const FFTVisualization = () => {
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
  
  // 高速フーリエ変換（FFT）の実装 - カスタム実装
  const computeFFT = (signal) => {
    const N = signal.length;
    const startTime = performance.now();
    
    // FFTを再帰的に実装するビットリバースとバタフライ演算を使用
    function fft(x) {
      const N = x.length;
      
      if (N <= 1) {
        return x;
      }
      
      // 偶数と奇数に分割
      const even = new Array(N/2);
      const odd = new Array(N/2);
      
      for (let i = 0; i < N/2; i++) {
        even[i] = x[i*2];
        odd[i] = x[i*2+1];
      }
      
      // 再帰的に計算
      const evenResult = fft(even);
      const oddResult = fft(odd);
      
      // バタフライ演算で結合
      const result = new Array(N);
      for (let k = 0; k < N/2; k++) {
        const angle = -2 * Math.PI * k / N;
        const t = {
          real: Math.cos(angle) * oddResult[k].real - Math.sin(angle) * oddResult[k].imag,
          imag: Math.cos(angle) * oddResult[k].imag + Math.sin(angle) * oddResult[k].real
        };
        
        result[k] = {
          real: evenResult[k].real + t.real,
          imag: evenResult[k].imag + t.imag
        };
        
        result[k + N/2] = {
          real: evenResult[k].real - t.real,
          imag: evenResult[k].imag - t.imag
        };
      }
      
      return result;
    }
    
    // 信号を複素数形式に変換
    const complexSignal = signal.map(val => ({ real: val, imag: 0 }));
    
    // FFT実行
    const result = fft(complexSignal);
    
    // マグニチュード計算
    const magnitude = result.map(val => 
      Math.sqrt(val.real * val.real + val.imag * val.imag));
    
    const endTime = performance.now();
    
    return { 
      result: magnitude.slice(0, N/2), // ナイキスト周波数まで
      time: endTime - startTime 
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
          
          setFftData(fftResult.result);
          setProcessingTime({
            dft: dftResult.time.toFixed(2),
            fft: fftResult.time.toFixed(2)
          });
          
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
    
    // 周波数領域信号の描画
    const drawFrequencySignal = () => {
      if (!fftCanvasRef.current || fftData.length === 0) return;
      
      const canvas = fftCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / fftData.length;
      // 最大値を見つける（0の場合は1を使用)
      const maxMagnitude = Math.max(...fftData) || 1;
      
      for (let i = 0; i < fftData.length; i++) {
        const x = i * barWidth;
        const barHeight = (fftData[i] / maxMagnitude) * height;
        
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
        ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);
        
        // 周波数ラベル（基本周波数の倍数を表示）
        if (i > 0 && i % Math.floor(frequency) === 0 && i < fftData.length / 4) {
          ctx.fillStyle = '#333';
          ctx.font = '10px Arial';
          ctx.fillText(`${i}f`, x, height - 5);
        }
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
    
  }, [audioData, fftData, componentSignals, highlightedFreq, frequency, signalType]);
  
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
          <label className="block mb-2">信号タイプ</label>
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
          <label className="block mb-2">サンプルサイズ</label>
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
          </select>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">基本周波数: {frequency} Hz</label>
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
                <strong>振幅:</strong> {fftData[highlightedFreq] ? fftData[highlightedFreq].toFixed(4) : '0'}
              </p>
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
          サンプルサイズを増やすと、FFTとDFTの処理時間の差が劇的に大きくなります。これは特に音声処理、画像処理、
          科学計算などリアルタイム処理が求められる場面で重要です。
        </p>
        <p className="mb-2">
          上のデモで様々な信号タイプやサンプルサイズを試して、FFTの効果を体験してみてください。
        </p>
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="text-md font-semibold mb-1">使い方のヒント:</h4>
          <ul className="list-disc list-inside text-sm">
            <li className="mb-1">「複合波形」は基本周波数と高調波（倍音）の合成を表示します</li>
            <li className="mb-1">周波数バーにマウスを重ねると、周波数帯と振幅の詳細が表示されます</li>
            <li className="mb-1">サンプルサイズを大きくすると（1024点以上）、FFTの速度優位性がより明確になります</li>
            <li>時間領域グラフでは、信号の構成成分が色分けされて表示されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FFTVisualization;
