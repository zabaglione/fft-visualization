# 高速FFT可視化デモ

高速フーリエ変換（FFT）の効果を視覚的に理解するためのデモアプリケーションです。従来の離散フーリエ変換（DFT）と高速フーリエ変換（FFT）の処理速度と結果を比較することができます。

## 機能

- 様々な波形（正弦波、矩形波、のこぎり波、ノイズ、複合波形）の生成と変換
- サンプルサイズの調整（64点〜2048点）
- 基本周波数の調整
- DFTとFFTの処理時間比較
- 時間領域と周波数領域の視覚化

## デモURL

https://zabaglione.github.io/fft-visualization/

## インストール方法

```bash
# リポジトリのクローン
git clone https://github.com/zabaglione/fft-visualization.git
cd fft-visualization

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## デプロイ方法

```bash
# GitHub Pagesへのデプロイ
npm run deploy
```

## 技術スタック

- React
- JavaScript
- HTML Canvas
- Tailwind CSS

## ライセンス

MIT

## 作者

@z_zabaglione
