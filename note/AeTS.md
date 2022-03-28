# AeTS 仕様詳細
## 概要
AeTS(**A**ya-**e**xp **T**rain **S**upport)は、綾急技研が開発した鉄道運行を支援する統合システムです。  
車両に搭載されたシステム単体で動作が完結するため、地上設備を増やすことなく導入が可能です。

AeTSは、以下の機能を搭載します。
- 速度制限アシスト機能(ver10.01より)
- 停車パターン支援機能(ver10.01より)
- 自動加速機能(ver10.01より)
- 車間維持機能(ver10.01より)
- 非常制動機能(ver10.01より)

```md
また、将来的に以下の機能を搭載する計画があります。
- 簡易自動放送機能
- 単線向け事故防止機能
```

このファイルには、AeTSの各機能の使い方や仕様の詳細をまとめて記述します。

## 共通
AeTSの各機能は基本的に、コマンドにより操作を行います。
基本的に、コマンドは以下の構文です。
```txt
/mctrl @r:11 dm:[機能] ([送信値の型])[送信値]
```

## 速度制限アシスト機能(ver10.01\~)
### 概要
走行中の路線の速度制限を越えないよう自動でブレーキをかけます。  
信号からの停止信号を受信して列車を停めたい場合にもこの機能を使います。  

### コマンド
有効化
```txt
/mctrl @r:11 dm:brakeAssist (Int)[制限速度]
```
無効化
```txt
/mctrl @r:11 dm:brakeAssist (Int)0
```
例
```txt
制限速度を40km/hに指定します。
/mctrl @r:11 dm:brakeAssist (Int)40

速度制限アシスト機能を解除します。
/mctrl @r:11 dm:brakeAssist (Int)0
```

### 仕様
- 制限速度に0を指定すると、"制限なし"とみなしてこの機能はOFFになります。
- 制限速度に2以上の整数Tを指定すると、制限速度はTkm/hとして、Tkm/hを超えたら(T-1)km/hを下回るまで常用最大制動をかけます。
- (T-1)km/hを下回ったらマスコンはNに戻ります。

***

## 停車パターン支援機能(ver10.01\~)
### 概要
停車パターンとなるコマンドを受信して列車を停車させます。  
主に駅での使用を想定しています。  

### コマンド
1次信号(停車駅接近)
```txt
/testfor @e[type=rtm:train,r=3]
/mctrl @r:3 dm:stopAssist (Int)1
```
2次信号(停車位置まで80m)
```txt
/testfor @e[type=rtm:train,r=3]
/mctrl @r:3 dm:stopAssist (Int)3
```
3次信号(停車位置)
```txt
/testfor @e[type=rtm:train,r=3]
/mctrl @r:3 dm:stopAssist (Int)4
```

### 仕様
- 1次信号を受け取ると、列車は速度を52km/hまで落として惰性走行を開始します。
- 2次信号を受け取ると、列車は速度を7km/hまで落として惰性走行をします。
- 3次信号を受け取ると、列車は停車するまで常用最大制動をかけ、停車後にB1にします。
- 自動加速機能の設定値(accelAssist)が1以上の場合、これらをガン無視します。(後述)

***

## 自動加速機能(ver10.01\~)
### 概要
制限速度に合わせて自動で加速操作を行います。  
速度制限アシストと組み合わせて使用し、疑似ATOを実現します。  

### コマンド
有効化
```txt
/mctrl @r:3 dm:accelAssist (Int)[正の整数]
```
無効化
```txt
/mctrl @r:3 dm:accelAssist (Int)0
```
例
```txt
3駅先まで自動で運転します。(2駅通過)
/mctrl @r:3 dm:accelAssist (Int)3

次の駅まで自動で運転します。(通過なし)
/mctrl @r:3 dm:accelAssist (Int)1

自動運転を強制的にOFFにします
/mctrl @r:3 dm:accelAssist (Int)0
```

### 仕様
一部"停車パターン支援"の仕様も解説します
- 内部的にはaccelAssistという変数(正確にはdataMap)に数値が保存されてます
  - その数値をコマンドでいじってます
  - というか全部そうです
- accelAssistに1以上の整数が指定されていて、かつ(brakeAssist-2)km/hを下回っている場合にP5で加速します
- この状態で停車パターン支援の1次信号を受け取るとaccelAssistを1減算、stopAssistを1加算します
- 停車パターン支援はaccelAssistが0のときに発動します
  - 停車駅の1次信号を受け取ったタイミングでaccelAssistが0、stopAssistが2になって減速するわけです

***

## 車間維持機能(ver10.01\~)
### 概要
"列車間の間隔を確保する装置"です。
ATACSに近いことをしています。

### コマンド
有効化
```txt
/mctrl @r:3 dm:interAssist (Int)1
```
無効化
```txt
/mctrl @r:3 dm:interAssist (Int)0
```

### 仕様
- 有効化されている時、前の列車とのおよその距離を検知します
- 検知した距離を元に安全に走行できる速度を求めます
- その速度が路線の速度制限より厳しい場合は他機能はこの機能で求めた速度を制限速度として振る舞わせます

***

## 非常制動機能(ver10.01\~)
### 概要
ただの非常制動です

### コマンド
非常制動
```txt
/mctrl @r:3 dm:eb (Int)1
```
非常制動解除
```txt
/mctrl @r:3 dm:eb (Int)0
```

### 仕様
- 解説するまでもないですね
- 非常制動かける以外何もしません

***

## 実装方法のメモ
ようするに今からコードの解説をします

### 共通
- onUpdateがありますね？そいつが呼び出されるわけです
- onUpdateが長くなると見づらいから各機能を小分けで関数にしたいね

### まずやること
車間維持機能がONなら安全維持のための制限速度を先に求めないといけない
- 関数作って制限速度を求めればいいですね
- atacs(limit, entity)
- dataMap "nowRail"と"beforeRail"(どっちもString)の更新処理
- dataMap "interAssist"が0ならreturn limit
- そうでない場合はまずlimitでB7の制動距離を求めます
- で、変数nextをつくります
- findRail=dm"nowRail",foundRail=dm"beforeRail",distanceF=0にします
- そしたらwhile文使って制動距離とdistanceFを比較しながらループ
    - findRailの隣のレールを取得します
    - たぶん2つ以上来ますがfoundRailでないものが来るまで内部でさらにwhile使って選別します
    - foundRailじゃない隣のレールを見つけ次第一旦ローカル変数nextRailにそのレールを入れます
    - そしたらfoundをfindで上書きしてからfindをnextで上書きします
    - foundに入ってるレールに列車がいるかを確認します
    - もしいたらそこでreturn distanceF
    - いなければdistanceFにfindのレール長を加算します
- while突破してたらreturn limit
- 追記、直でrailMapをStringで保存しようと思ったんですが戻せなかったので1tick前の車両のx,y,z座標を保存する方針で

問題点はStringで来てるのを処理できるのかということくらい

### 設計思想的な何か
ここで初めて各機能が動かせるわけです
- 最終的にどういう行動を取るかの指令をするコードは一回にしたい
- とりあえず「なにもしない」(null)を初期値にすることを念頭に置け

### 速度制限アシスト機能(funcBrakeAssist)
- 結局こいつの最終的なパターンはB7かNか何もしないのいずれかで…
- じゃあreturnの値は-7か0かnullでいいですね
- dm:brakeAssistが0ならreturn null確定なので最後のreturnで処理すれば良くて
- そうでない場合は-7か0の可能性あり
- 「dm:brakeAssist < entity.getSpeed()」なら制限超過
    - このときにentity.getNotch()が-7でないならreturn -7
    - 非常制動その他諸々でB8になる可能性を考えましたがそれはonUpdateで処理
- 「(dm:brakeAssist - 1) > entity.getSpeed()」なら制動解除
    - このときにentity.getNotch()が0でないならreturn 0
- この時点でreturnしてなければreturn nullで大丈夫

### 停車パターン支援機能(funcStopAssist)
内部で自動加速機能のfunctionを呼び出します
- まずaccelAssistが1以上なら停車パターンはガン無視しなきゃいけません
- しかもその場合は自動加速機能の値を返す必要があります
- じゃあこっから自動加速機能のfunctionを呼べば良いね
- つまりガン無視条件該当の場合は「return funcAccelAssist(…)」なわけです
- ということは以下はガン無視条件に該当しない(else)場合ですね
- 先にaccelAssist=4を処理します
    - この場合は「停止してなければreturn -7」です、強制で止めましょう
    - 停止してればaccelAssistを0に変えてあげてreturn -1で…
- 次にaccelAssistが2か3の場合を処理します、とりあえずif作って中で変数stopLimitを宣言だけしてください
    - さらに中でswitch文書いて2ならstopLimitには52を、3ならstopLimitには7を入れます
    - そしたらあとは共通じゃないですか
        - stopLimit < entity.getSpeed()なら速度落とさなきゃいけないので強制return -7
        - stopLimit >= entity.getSpeed()かつ今B7ならreturn 0
- この時点でreturnされてなかったらnullを返せば良いはずです
    - 想定外の操作をした場合とnullの場合しかここに到達しないはずなので…

### 自動加速機能(funcAccelAssist)
こいつはonUpdateじゃなくて停車パターン支援機能から呼び出されます
- とはいえやることは同じです、ノッチを返せば良いんです
- dm:accelAssistが1未満なら絶対nullなんでif文
    - (dm:brakeAssist - 2) > entity.getSpeed() ならreturn 5
- あれ？それ以外全部return nullでいいじゃん
    - 制限-2以上制限以下なら加速or減速→惰性の2パターンなのでここではなにもしなくていい

## 非常制動機能(funcEB)
- 非常制動をかけるべきかをBooleanで返す関数です
- dm:eb見るだけだね、あとは察せるでしょ

### 話はonUpdateに戻って…
- とりあえず変数controlを宣言します
- funcBrakeAssist(limit, entity)でcontrolを上書きします
- funcStopAssist(limit, entity)がnullでなければそれでcontrolを上書きします
- funcEBがtrueならcontrolを-8で上書きします
- そしたらcontrolは今列車がとるべきNotchになってるはずなんです
- そしたらentity.setNotch(control)で完成ですね！

あとはこれをコードに起こせばいいだけです頑張ってください  
2022-03-28 ド深夜 綾坂こと
