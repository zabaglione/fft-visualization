import React from 'react';
import './App.css';
import FFTVisualization from './components/FFTVisualization';

function App() {
  // 以前はコンポーネント間でデータを共有するために使用されていたが、
  // 今はメインコンポーネントのみになったため、シンプルな構造に修正
  const handleDataUpdate = () => {
    // 将来的な拡張のために空の関数として残しておく
  };

  return (
    <div className="App bg-gray-50 min-h-screen">
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold">高速フーリエ変換 (FFT) 可視化</h1>
          <p className="text-blue-100 mt-1">リアルタイムでFFTの効果と原理を学ぶインタラクティブデモ</p>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-4">
        <FFTVisualization 
          onDataUpdate={handleDataUpdate}
        />
      </main>
      
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-sm">
          <p>&copy; {new Date().getFullYear()} FFT可視化ツール | <a href="https://github.com/zabaglione/fft-visualization" className="text-blue-300 hover:underline">GitHub</a></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
