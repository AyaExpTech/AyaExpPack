# AyasakaExpressPack "AXP" (綾坂急行パック)

## バージョン
ver 10.01-1001a

## 概要
綾急技研が開発する、Minecraft + RealTrainMod 環境で使用可能な架空車両のパックです。  
~~もともと綾急技研はこれ作る名義っていう話します？~~

## 収録車両
### 綾急技研 AE3000系
- ~~なんだこの化け物性能は~~
- フラッグシップ車両です。
- こいつが覇権とってる路線の運営はだいたい狂ってます(主に綾坂こと)
  - 特にスジ屋が狂ってるんで猶予がないです
  - 少しでも猶予をもたせたいですね？じゃあ同じ車両で全種別統一しちゃいましょう(デュアルシート)
  - 逃げ性能をあげて待避を減らしましょう(4.2km/h/s)
  - 特急にも使うんで最高速度もほしいですよね(160km/h)  
    ```txt
    もともと215km/hだったんですけどこの車体でそれは酷使しすぎだなと反省したので
    在来線最高速度の160km/hに落としました
    え？それでも速い？気のせいだと思います。
    ```
- 2両編成です。M'c+Mcです。
  - 4.2km/h/sかつ160km/hを実現するため(建前)
  - Tcの差分作るのめんどい(本音)
- なんか色々積んでます。
  - AeTSとかいう綾急技研独自開発の統合システムに対応しています
  - 速度制限を守れるようアシストします
  - 2･4両編成向けに停車パターンを用意してます
    - まず駅間で次の停車パターン設置場所(駅)で停車することを送信します
    - その状態で停車パターン予告を受信すると50km/hまで落ちます
    - 負荷の関係で最大4両だと思うんで85m(20×4+5)なんです
    - というか僕がホーム長さ90mくらいで作ってます、使いたけりゃ改造しろ
    - 改造難度は高くないと思います
  - 自動加速機能もあるんであわせ技でATOできます
    - あれです、ボタン押したら次の駅まで自動で走るやつです
    - 実際はボタン操作じゃなくて次の停車駅までの駅数をコマンドで送信します
  - ドア開閉つけようか迷ったんですけどつけませんでした
    - チャンクロードの関係で結局運転士が一人は乗ったほうが良いという知見を得た
    - だったら運転士にドア開閉やらせればよくない？
    - 車掌は人数削減で乗せませんが運転士がいるならそれでいいよね
  - ATACSもどきを積んでます
    - (ATACSでは)ないです
    - でも発想はATACSとほぼ同じなんで"もどき"です
    - 違いは車両自身で判定が完結することじゃないですかね
    - なのでATACSと呼べないんですよ、"AeTSの車間維持機能"と呼んでください
    - 対向が来ない線路ならこいつだけで安全に走行できます
    - 対向が来る線路は地上信号使ってください
      - 仮対応するアイデアはあるんですが単線に対応できないんですよね…
      - あんまり起こってほしくない挙動が起こりそうなので結局信号推奨なんですよ
      - だったらそのアイデア具現化するのはアプデでのんびり対応すればいいですよね
  - それっぽい車内放送を流すスクリプトも作りました褒めろ
    - 2^53-1以下の自然数で内容を指定します
    - 0は「何もしない」
    - どこにどういう放送を入れるかは自由です
    - 放送連結数に制限はありますが入れる放送の数によるのであとで計算します…
    - 指定する数字の求め方はめんどいのでコード書いてから書きます
    - まあ「p進数n桁で表してそれを10進数に変換する(pはパーツ総数、nは連結数)」だけなんですけど
  - その他小ネタ機能
    - パンタグラフは奇数号車(内部的には偶数号車?)のみに描画されます
      - なので同じモデルで2+2両を組成するといい感じにパンタが間引かれます

## クレジット
水音車両(水音台車DT17・車両キット)

## 連絡先
綾急技研
- twitter…@AyaExpTech
- Gmail…ayasakaexpresstech@gmail.com
  - 念の為言っとくとGmailは気づかないかも

綾坂こと
- twitter…@Ayasaka_info
- Gmail…ayagawap@gmail.com

2022-03-27
AyaExpTech
