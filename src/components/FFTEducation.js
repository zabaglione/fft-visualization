import React, { useState, useRef, useEffect } from 'react';

const FFTEducation = ({ showStep, setShowStep, fftData, sampleSize, fftStages, setActiveTab, onSignalParamsUpdate }) => {
  const butterflyCanvasRef = useRef(null);
  const [currentTab, setCurrentTab] = useState('intro');
  const [hasData, setHasData] = useState(false);
  const [customSignalType, setCustomSignalType] = useState('sine');
  const [customFrequency, setCustomFrequency] = useState(5);
  
  // fftStagesが更新されたらデータがあることを記録
  useEffect(() => {
    if (fftStages && fftStages.length > 0) {
      setHasData(true);
    }
  }, [fftStages]);
  
  // FFTステージの描画ロジック
  useEffect(() => {
    if (!butterflyCanvasRef.current || !fftStages || fftStages.length === 0) return;
    
    const canvas = butterflyCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // ステージとデータが存在するか確認
    if (showStep >= fftStages.length) return;
    
    const stageData = fftStages[showStep];
    if (!stageData || stageData.length === 0) return;
    
    // 軸の描画
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    // X軸（中央）
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // 目盛りの描画
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    
    for (let i = 0; i < stageData.length; i += Math.max(1, Math.floor(stageData.length / 16))) {
      const x = (i / stageData.length) * width;
      ctx.beginPath();
      ctx.moveTo(x, height / 2 - 5);
      ctx.lineTo(x, height / 2 + 5);
      ctx.stroke();
      ctx.fillText(i, x - 5, height / 2 + 20);
    }
    
    // データの描画
    const drawStep = Math.max(1, Math.floor(stageData.length / width));
    
    // 実部（青）
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < stageData.length; i += drawStep) {
      const x = (i / stageData.length) * width;
      // 実部を中央から上下に表示（スケーリング）
      const normalizedReal = stageData[i].real / (Math.max(...stageData.map(d => Math.abs(d.real))) || 1);
      const y = height / 2 * (1 - normalizedReal * 0.8); // 80%の高さに収める
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // 入力信号（ステージ0）以外のステージのみ虚部を表示
    if (showStep > 0) {
      // 虚部（赤）
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < stageData.length; i += drawStep) {
        const x = (i / stageData.length) * width;
        // 虚部も中央から上下に表示
        const normalizedImag = stageData[i].imag / (Math.max(...stageData.map(d => Math.abs(d.imag))) || 1);
        const y = height / 2 * (1 - normalizedImag * 0.8);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    // マグニチュード（紫、半透明）
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(150, 50, 200, 0.6)';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < stageData.length; i += drawStep) {
      const x = (i / stageData.length) * width;
      const normalizedMag = stageData[i].magnitude / (Math.max(...stageData.map(d => d.magnitude)) || 1);
      const y = height * (1 - normalizedMag * 0.9); // 下から上に表示
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // 凡例
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.fillText('実部 (Real)', 20, 20);
    
    if (showStep > 0) {
      ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
      ctx.fillText('虚部 (Imaginary)', 120, 20);
    }
    
    ctx.fillStyle = 'rgba(150, 50, 200, 0.6)';
    ctx.fillText('振幅 (Magnitude)', showStep > 0 ? 250 : 120, 20);
    
    // ステージのタイトル
    ctx.font = '14px Arial Bold';
    ctx.fillStyle = '#333';
    ctx.fillText(
      showStep === 0 
        ? '入力信号 (Input Signal)'
        : `バタフライステージ ${showStep} (Butterfly Stage ${showStep})`, 
      width / 2 - 150, 
      height - 10
    );
    
  }, [showStep, fftStages]);

  // 各ステップの説明コンテンツ
  const stepContents = {
    intro: (
      <div>
        <h3 className="text-lg font-semibold mb-2">高速フーリエ変換（FFT）入門</h3>
        <p className="mb-3">
          高速フーリエ変換（FFT）は、離散フーリエ変換（DFT）を効率的に計算するアルゴリズムです。
          DFTはO(N²)の計算量が必要ですが、FFTはO(N log N)に削減し、特に大きなデータセットで劇的な
          スピードアップを実現します。
        </p>
        <p className="mb-3">
          FFTの基本的なアイデアは「分割統治法」です。N点のDFTを2つのN/2点のDFTに分解し、
          再帰的に計算することで効率化します。
        </p>
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium mb-1">FFTの主な用途：</h4>
          <ul className="list-disc list-inside">
            <li>音声・音楽処理（スペクトル分析）</li>
            <li>画像処理（フィルタリング）</li>
            <li>通信システム（変調・復調）</li>
            <li>科学計算（データ分析、数値解析）</li>
            <li>機械学習（特徴抽出）</li>
          </ul>
        </div>
      </div>
    ),
    step1: (
      <div>
        <h3 className="text-lg font-semibold mb-2">ステップ1: 信号の分割</h3>
        <p className="mb-3">
          FFTの最初のステップでは、サイズNの入力信号を偶数インデックスと奇数インデックスの
          2つのサイズN/2の部分信号に分割します。
        </p>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-1">元の信号 x[n]:</h4>
            <div className="font-mono text-sm">
              [x[0], x[1], x[2], x[3], ..., x[N-1]]
            </div>
          </div>
          <div className="flex-1 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-1">偶数サンプル x_even[n]:</h4>
            <div className="font-mono text-sm">
              [x[0], x[2], x[4], ..., x[N-2]]
            </div>
          </div>
          <div className="flex-1 p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium mb-1">奇数サンプル x_odd[n]:</h4>
            <div className="font-mono text-sm">
              [x[1], x[3], x[5], ..., x[N-1]]
            </div>
          </div>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium mb-1">数式表現:</h4>
          <p className="font-mono text-sm">
            x_even[n] = x[2n] （n = 0, 1, 2, ..., N/2-1）<br />
            x_odd[n] = x[2n+1] （n = 0, 1, 2, ..., N/2-1）
          </p>
        </div>
        <div className="mt-4">
          <p>
            この分割は再帰的に適用され、信号サイズが1になるまで続きます（基底ケース）。
            サンプルサイズ{sampleSize}の信号では、log₂({sampleSize}) = {Math.log2(sampleSize)}回の
            分割ステップが必要です。
          </p>
        </div>
      </div>
    ),
    step2: (
      <div>
        <h3 className="text-lg font-semibold mb-2">ステップ2: 再帰的計算</h3>
        <p className="mb-3">
          分割した各部分信号に対して、再帰的にDFTを計算します。これにより、
          元の大きなDFT問題が、複数の小さなDFT問題に分解されます。
        </p>
        <div className="flex flex-col mb-4 bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-1">再帰的分解の例（N=8の信号）:</h4>
          <div className="overflow-x-auto">
            <pre className="text-xs">
{`DFT(x[0...7])
├── DFT(x[0,2,4,6])
│   ├── DFT(x[0,4])
│   │   ├── DFT(x[0]) → 基底ケース
│   │   └── DFT(x[4]) → 基底ケース
│   └── DFT(x[2,6])
│       ├── DFT(x[2]) → 基底ケース
│       └── DFT(x[6]) → 基底ケース
└── DFT(x[1,3,5,7])
    ├── DFT(x[1,5])
    │   ├── DFT(x[1]) → 基底ケース
    │   └── DFT(x[5]) → 基底ケース
    └── DFT(x[3,7])
        ├── DFT(x[3]) → 基底ケース
        └── DFT(x[7]) → 基底ケース`}
            </pre>
          </div>
        </div>
        <p className="mb-3">
          サイズN=1の信号のDFTは信号自体です（単純な基底ケース）。再帰的に小さなDFTを
          計算していくことで、計算量が削減されます。
        </p>
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-1">複雑度の削減:</h4>
          <p>
            通常のDFT: O(N²) → FFT: O(N log N)<br />
            例: N={sampleSize}の場合、計算回数は約{sampleSize * sampleSize}から{Math.floor(sampleSize * Math.log2(sampleSize))}に削減されます！
          </p>
        </div>
      </div>
    ),
    step3: (
      <div>
        <h3 className="text-lg font-semibold mb-2">ステップ3: バタフライ演算と結合</h3>
        <p className="mb-3">
          再帰的に計算した部分的なDFT結果を「バタフライ演算」を使って結合し、
          最終的なFFT結果を生成します。
        </p>
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-1">バタフライ演算の数式:</h4>
          <p className="font-mono text-sm mb-2">
            X[k] = X_even[k] + W_N^k · X_odd[k]<br />
            X[k+N/2] = X_even[k] - W_N^k · X_odd[k]
          </p>
          <p className="text-sm mb-1">ここで:</p>
          <ul className="list-disc list-inside text-sm">
            <li>X_even[k]とX_odd[k]は部分DFTの結果</li>
            <li>W_N^k = e^(-j2πk/N)は「回転因子」（twiddle factor）</li>
            <li>kは0からN/2-1までの値</li>
          </ul>
        </div>
        <div className="mb-4">
          <h4 className="font-medium mb-1">バタフライ図の例（N=8）:</h4>
          <div className="w-full p-3 bg-blue-50 rounded-lg overflow-x-auto">
            <svg viewBox="0 0 500 260" className="w-full h-auto">
              {/* 入力点 */}
              <text x="10" y="30" className="text-xs">x[0]</text>
              <text x="10" y="70" className="text-xs">x[4]</text>
              <text x="10" y="110" className="text-xs">x[2]</text>
              <text x="10" y="150" className="text-xs">x[6]</text>
              <text x="10" y="190" className="text-xs">x[1]</text>
              <text x="10" y="230" className="text-xs">x[5]</text>
              <text x="10" y="270" className="text-xs">x[3]</text>
              <text x="10" y="310" className="text-xs">x[7]</text>
              
              {/* 第1段階 */}
              <line x1="30" y1="30" x2="120" y2="30" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="70" x2="120" y2="70" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="110" x2="120" y2="110" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="150" x2="120" y2="150" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="190" x2="120" y2="190" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="230" x2="120" y2="230" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="270" x2="120" y2="270" stroke="#666" strokeWidth="1" />
              <line x1="30" y1="310" x2="120" y2="310" stroke="#666" strokeWidth="1" />
              
              {/* バタフライ第1段階 */}
              <line x1="120" y1="30" x2="200" y2="30" stroke="#f00" strokeWidth="1.5" />
              <line x1="120" y1="70" x2="200" y2="70" stroke="#f00" strokeWidth="1.5" />
              <line x1="120" y1="30" x2="200" y2="70" stroke="#f00" strokeWidth="1.5" />
              <line x1="120" y1="70" x2="200" y2="30" stroke="#f00" strokeWidth="1.5" />
              
              <line x1="120" y1="110" x2="200" y2="110" stroke="#0a0" strokeWidth="1.5" />
              <line x1="120" y1="150" x2="200" y2="150" stroke="#0a0" strokeWidth="1.5" />
              <line x1="120" y1="110" x2="200" y2="150" stroke="#0a0" strokeWidth="1.5" />
              <line x1="120" y1="150" x2="200" y2="110" stroke="#0a0" strokeWidth="1.5" />
              
              <line x1="120" y1="190" x2="200" y2="190" stroke="#00f" strokeWidth="1.5" />
              <line x1="120" y1="230" x2="200" y2="230" stroke="#00f" strokeWidth="1.5" />
              <line x1="120" y1="190" x2="200" y2="230" stroke="#00f" strokeWidth="1.5" />
              <line x1="120" y1="230" x2="200" y2="190" stroke="#00f" strokeWidth="1.5" />
              
              <line x1="120" y1="270" x2="200" y2="270" stroke="#909" strokeWidth="1.5" />
              <line x1="120" y1="310" x2="200" y2="310" stroke="#909" strokeWidth="1.5" />
              <line x1="120" y1="270" x2="200" y2="310" stroke="#909" strokeWidth="1.5" />
              <line x1="120" y1="310" x2="200" y2="270" stroke="#909" strokeWidth="1.5" />
              
              {/* バタフライ第2段階 */}
              <line x1="200" y1="30" x2="300" y2="30" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="110" x2="300" y2="110" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="30" x2="300" y2="110" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="110" x2="300" y2="30" stroke="#f90" strokeWidth="1.5" />
              
              <line x1="200" y1="70" x2="300" y2="70" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="150" x2="300" y2="150" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="70" x2="300" y2="150" stroke="#f90" strokeWidth="1.5" />
              <line x1="200" y1="150" x2="300" y2="70" stroke="#f90" strokeWidth="1.5" />
              
              <line x1="200" y1="190" x2="300" y2="190" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="270" x2="300" y2="270" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="190" x2="300" y2="270" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="270" x2="300" y2="190" stroke="#099" strokeWidth="1.5" />
              
              <line x1="200" y1="230" x2="300" y2="230" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="310" x2="300" y2="310" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="230" x2="300" y2="310" stroke="#099" strokeWidth="1.5" />
              <line x1="200" y1="310" x2="300" y2="230" stroke="#099" strokeWidth="1.5" />
              
              {/* バタフライ第3段階 */}
              <line x1="300" y1="30" x2="400" y2="30" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="70" x2="400" y2="70" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="110" x2="400" y2="110" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="150" x2="400" y2="150" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="190" x2="400" y2="190" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="230" x2="400" y2="230" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="270" x2="400" y2="270" stroke="#666" strokeWidth="1.5" />
              <line x1="300" y1="310" x2="400" y2="310" stroke="#666" strokeWidth="1.5" />
              
              {/* 出力点 */}
              <text x="410" y="30" className="text-xs">X[0]</text>
              <text x="410" y="70" className="text-xs">X[1]</text>
              <text x="410" y="110" className="text-xs">X[2]</text>
              <text x="410" y="150" className="text-xs">X[3]</text>
              <text x="410" y="190" className="text-xs">X[4]</text>
              <text x="410" y="230" className="text-xs">X[5]</text>
              <text x="410" y="270" className="text-xs">X[6]</text>
              <text x="410" y="310" className="text-xs">X[7]</text>
              
              {/* ステージラベル */}
              <text x="120" y="10" className="text-xs font-bold text-center">ステージ1</text>
              <text x="240" y="10" className="text-xs font-bold text-center">ステージ2</text>
              <text x="350" y="10" className="text-xs font-bold text-center">ステージ3</text>
            </svg>
          </div>
        </div>
        <p className="mt-3">
          バタフライ演算は並列計算が可能なため、ハードウェア実装に適しています。
          各ステージでの演算はそれぞれ独立して計算できるため、効率的に実装できます。
        </p>
      </div>
    ),
    interactive: (
      <div>
        <h3 className="text-lg font-semibold mb-2">インタラクティブFFT</h3>
        <p className="mb-3">
          このセクションでは、FFT計算の各ステージの中間結果をインタラクティブに確認できます。
          サンプルサイズ {sampleSize} のFFT計算には {Math.max(1, Math.ceil(Math.log2(sampleSize)))} 段階のバタフライステージが必要です。
        </p>
        
        {!hasData ? (
          <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-yellow-800 mb-2">信号データがありません</h4>
            <p className="text-sm mb-3">
              FFT計算の過程を表示するには、まず信号を生成する必要があります。
            </p>
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium">以下の手順で信号を生成してください：</p>
              <ol className="list-decimal list-inside text-sm ml-2">
                <li>「FFT可視化」タブをクリックして移動します</li>
                <li>波形タイプ（正弦波、矩形波など）を選択します</li>
                <li>サンプルサイズや周波数を調整します</li>
                <li>波形が自動生成されます</li>
                <li>再び「教育モード」タブに戻るとデータが表示されます</li>
              </ol>
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => setActiveTab('visualization')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  FFT可視化タブへ移動
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">FFT計算過程の表示ステージ:</h4>
              <p className="text-sm mb-2">
                各ボタンをクリックして、FFT計算の各段階での信号の状態を確認できます。
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.max(1, Math.ceil(Math.log2(sampleSize))) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setShowStep(i)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        showStep === i 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {i === 0 ? '入力信号' : `計算ステージ ${i}`}
                    </button>
                  ))}
                </div>
                
                {/* 入力信号の場合のみ、信号タイプ選択を表示 */}
                {showStep === 0 && (
                  <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                    <h5 className="text-sm font-medium mb-2">入力信号タイプの変更:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">信号タイプ:</label>
                        <select
                          value={customSignalType}
                          onChange={(e) => setCustomSignalType(e.target.value)}
                          className="w-full p-2 text-sm border rounded"
                        >
                          <option value="sine">正弦波</option>
                          <option value="square">矩形波</option>
                          <option value="sawtooth">のこぎり波</option>
                          <option value="noise">ノイズ</option>
                          <option value="complex">複合波形</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">基本周波数: {customFrequency} Hz</label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={customFrequency}
                          onChange={(e) => setCustomFrequency(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={() => {
                          // 信号パラメータを親コンポーネントに通知
                          if (typeof onSignalParamsUpdate === 'function') {
                            onSignalParamsUpdate(customSignalType, customFrequency);
                          }
                          // 可視化タブに切り替え
                          setActiveTab('visualization');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        この設定で信号を生成
                      </button>
                    </div>
                  </div>
                )}
                {fftStages && fftStages.length > 0 && (
                  <button
                    onClick={() => setShowStep(fftStages.length - 1)}
                    className={`px-3 py-2 rounded-md text-sm ${
                      showStep === fftStages.length - 1
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-100 hover:bg-green-200'
                    }`}
                  >
                    最終結果
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-1 text-lg">
                {showStep === 0 ? '【入力】時間領域の信号' : 
                 showStep === fftStages.length - 1 ? '【最終結果】周波数領域の完成形' :
                 `【ステージ${showStep}】バタフライ演算ステージ`}
              </h4>
              <p className="text-sm mb-3">
                {showStep === 0 
                  ? `入力信号（${customSignalType === 'sine' ? '正弦波' : 
                      customSignalType === 'square' ? '矩形波' : 
                      customSignalType === 'sawtooth' ? 'のこぎり波' : 
                      customSignalType === 'noise' ? 'ノイズ' : '複合波形'}）の時間領域表現です。これからFFT変換が開始されます。` 
                  : showStep === fftStages.length - 1
                    ? '最終的なFFT変換結果です。周波数領域での表現が完成しました。'
                    : `このステージでは、バタフライ演算により信号を周波数領域に段階的に変換中です。
                       各バタフライユニットで入力値がどのように結合されるかを観察できます。`}
              </p>
              
              <div className="bg-white p-4 rounded border shadow-inner">
                {fftStages && fftStages.length > 0 ? (
                  <div>
                    <div className="relative">
                      <canvas 
                        ref={butterflyCanvasRef} 
                        width="800" 
                        height="300" 
                        className="w-full h-auto bg-white rounded"
                      />
                      <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded text-xs border">
                        <div className="flex items-center">
                          <span className="w-3 h-3 inline-block mr-1 bg-blue-500 rounded-full"></span>
                          <span>実部</span>
                        </div>
                        {showStep > 0 && (
                          <div className="flex items-center">
                            <span className="w-3 h-3 inline-block mr-1 bg-red-500 rounded-full"></span>
                            <span>虚部</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="w-3 h-3 inline-block mr-1 bg-purple-500 rounded-full"></span>
                          <span>振幅</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-50 rounded border">
                        <h5 className="text-sm font-medium">実部（Real）</h5>
                        <p className="text-xs">{showStep === 0 ? '元の時間領域信号。横軸はサンプルインデックス、縦軸は振幅です。' : '信号の実部成分。横軸はデータインデックス、縦軸は値の大きさを表します。'}</p>
                      </div>
                      {showStep > 0 ? (
                        <div className="p-3 bg-red-50 rounded border">
                          <h5 className="text-sm font-medium">虚部（Imaginary）</h5>
                          <p className="text-xs">信号の虚部成分。FFT計算過程で生成される成分で、ステージが進むにつれ周波数情報を表すようになります。</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-100 rounded border">
                          <h5 className="text-sm font-medium text-gray-500">虚部（表示なし）</h5>
                          <p className="text-xs text-gray-500">元の時間領域信号には虚部がありません。虚部はFFT計算過程で生成されます。</p>
                        </div>
                      )}
                      <div className="p-3 bg-purple-50 rounded border">
                        <h5 className="text-sm font-medium">振幅（Magnitude）</h5>
                        <p className="text-xs">{showStep === 0 ? '元信号の絶対値。最終的にFFT変換後のスペクトル分布になります。' : '実部と虚部を合成した振幅。最終的にFFT結果のスペクトルを形成します。'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <svg className="inline-block w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-medium">データが読み込めません</p>
                    <p className="mt-2 text-sm">
                      FFT可視化タブで信号を生成した後、このタブを再度開いてください。
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {fftStages && fftStages.length > 0 && showStep > 0 && showStep < fftStages.length - 1 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium mb-2 text-yellow-800">バタフライ演算の詳細説明（ステージ {showStep}）</h4>
                <p className="text-sm mb-3">
                  このステージでは、データがバタフライパターンで結合されています。
                  各バタフライユニットは以下の演算を実行します:
                </p>
                <div className="bg-white p-3 rounded border mb-3">
                  <div className="font-mono text-sm mb-2 text-center">
                    <p>X[k] = X_even[k] + ω<sup>k</sup><sub>N</sub> · X_odd[k]</p>
                    <p>X[k+N/2] = X_even[k] - ω<sup>k</sup><sub>N</sub> · X_odd[k]</p>
                  </div>
                  <p className="mt-1 text-xs text-center text-gray-600">
                    ただし、ω<sup>k</sup><sub>N</sub> = e<sup>-j2πk/N</sup> （回転因子/twiddle factor）
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h5 className="text-sm font-medium mb-1">このステージの特徴:</h5>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>バタフライのサイズ: {Math.pow(2, showStep)} サンプル</li>
                      <li>並列演算ユニット: {sampleSize / Math.pow(2, showStep)}</li>
                      <li>周波数分解能: {Math.pow(2, showStep-1)} 分割</li>
                      <li>計算複雑度: O(N)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">変換の進行状況:</h5>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-4 mb-2 text-xs flex rounded bg-gray-200">
                        <div
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                          style={{ width: `${(showStep / (Math.log2(sampleSize))) * 100}%` }}
                        >
                          {Math.round((showStep / (Math.log2(sampleSize))) * 100)}%
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>時間領域</span>
                        <span>周波数領域</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {fftStages && fftStages.length > 0 && showStep === fftStages.length - 1 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium mb-2 text-green-800">FFT変換完了！</h4>
                <p className="text-sm mb-3">
                  これが最終的なFFT変換結果です。横軸は周波数（高調波成分）を表し、縦軸は各周波数の強度を示しています。
                </p>
                <div className="bg-white p-3 rounded border">
                  <h5 className="text-sm font-medium mb-1">ピーク解析:</h5>
                  <p className="text-xs mb-2">
                    振幅のピークは、入力信号に含まれる主要な周波数成分を示しています。
                    例えば、単一の正弦波の場合は基本周波数に鋭いピークが見られ、
                    複合波形の場合は複数の周波数成分（高調波）にピークが現れます。
                  </p>
                  <p className="text-xs">
                    計算時間: O(N log N) = {Math.floor(sampleSize * Math.log2(sampleSize))} 演算
                    <br />
                    通常のDFTと比較すると {Math.round((sampleSize * sampleSize) / (sampleSize * Math.log2(sampleSize)))} 倍高速！
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    applications: (
      <div>
        <h3 className="text-lg font-semibold mb-2">FFTの応用例</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-1">1. 音声処理</h4>
            <p className="text-sm mb-2">
              FFTは音声信号をスペクトル分析する際に広く使われています：
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>イコライザー</li>
              <li>音声認識</li>
              <li>周波数フィルタリング</li>
              <li>ピッチ検出</li>
            </ul>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium mb-1">2. 画像処理</h4>
            <p className="text-sm mb-2">
              2次元FFTを使用して画像処理を行います：
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>ノイズ除去</li>
              <li>エッジ検出</li>
              <li>圧縮（JPEG等）</li>
              <li>パターン認識</li>
            </ul>
          </div>
          
          <div className="p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-medium mb-1">3. 通信システム</h4>
            <p className="text-sm mb-2">
              FFTは無線通信の基盤として重要です：
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>OFDM（直交周波数分割多重化）</li>
              <li>シグナルプロセッシング</li>
              <li>変調・復調</li>
              <li>レーダーシステム</li>
            </ul>
          </div>
          
          <div className="p-3 bg-purple-50 rounded-lg">
            <h4 className="font-medium mb-1">4. 科学計算</h4>
            <p className="text-sm mb-2">
              科学研究でもFFTは広く活用されています：
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>量子物理学シミュレーション</li>
              <li>天文学データ解析</li>
              <li>流体力学計算</li>
              <li>医療画像処理（MRI、CT）</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-1">FFTが重要な理由</h4>
          <p className="text-sm">
            サンプルサイズが大きくなると、FFTの計算量の優位性が顕著になります。
            例えば、サンプルサイズ{sampleSize}の場合：
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2">アルゴリズム</th>
                  <th className="p-2">計算複雑性</th>
                  <th className="p-2">実際の演算回数（推定）</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">通常のDFT</td>
                  <td className="p-2">O(N²)</td>
                  <td className="p-2">{sampleSize * sampleSize}</td>
                </tr>
                <tr>
                  <td className="p-2">FFT</td>
                  <td className="p-2">O(N log N)</td>
                  <td className="p-2">{Math.floor(sampleSize * Math.log2(sampleSize))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm">
            大きなサンプルサイズ（例：10万点以上）では、FFTの使用により計算時間が数時間から数秒に短縮されることもあります。
          </p>
        </div>
      </div>
    )
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">FFTの仕組みを理解する</h2>
      
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCurrentTab('intro')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'intro' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          FFT入門
        </button>
        <button
          onClick={() => setCurrentTab('step1')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'step1' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          ステップ1: 分割
        </button>
        <button
          onClick={() => setCurrentTab('step2')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'step2' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          ステップ2: 再帰
        </button>
        <button
          onClick={() => setCurrentTab('step3')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'step3' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          ステップ3: バタフライ
        </button>
        <button
          onClick={() => setCurrentTab('interactive')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'interactive' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          インタラクティブ
        </button>
        <button
          onClick={() => setCurrentTab('applications')}
          className={`px-3 py-1 rounded-md text-sm ${
            currentTab === 'applications' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          応用例
        </button>
      </div>
      
      <div className="border-t pt-4">
        {stepContents[currentTab]}
      </div>
    </div>
  );
};

export default FFTEducation;