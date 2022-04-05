/**
 * AyaExpPack向けサーバースクリプト
 * ・AeTS(運転支援システム)
 * ・綾急向け方向幕切り替え支援機能
 * ・その他いろいろ
 */

/**
 * 綾急向け方向幕切り替え支援機能
 * さすがに90個もあると大変だし種別くらいはカスタムボタンで指定できるといいかなと。
 * 実装する必要のあるカスタムボタン
 * ・Button0…[特殊,普通,快速,急行,特急]
 * ボタンを押すと行き先はそのままで種別だけ切り替わります。
 * 「特殊→各種別」の操作は行き先なしの種別表示になります。
 * 「各種別→特殊」の操作は"綾急グループ"表示になります。
 * 従来の方向幕機能を一部制限します(従来の方向幕指定で種別選択ができなくなります)。
 */
function changeRollSign(button, entity) {
    var nowSign = entity.getTrainStateData(8); //現在の方向幕
    if (nowSign < 10) {
        //nowSignが10未満の場合は特殊表示になっているため別で処理。
        switch (button) {
            case 0:
                //buttonが0の場合は変える必要なし
                break;
            default:
                //buttonが0ではない場合は"種別のみの表示"に切り替え
                entity.setVehicleState(TrainState.getStateType(8), button * 20 + 9);
                break;
        }
    }
    if (nowSign >= 10) {
        //nowSignが10以上なら現在は種別表示。
        switch (button) {
            case 0:
                //特殊表示に切り替える場合切り替え先は固定。
                entity.setVehicleState(TrainState.getStateType(8), 0);
                break;
            default:
                //特殊表示に切り替えろと言われてなければ現在の表示の行き先のまま種別をカスタムボタンに合わせる挙動でOK
                entity.setVehicleState(TrainState.getStateType(8), ((button * 20) + (nowSign % 20)));
                break;
        }
    }
}

/**
 * AeTS(運転支援)
 * 信号システムとかぶちこんだやつ。もともと完全自動運転機能もあったが綾急にいらないので消えた。
 * 実装する必要のあるカスタムボタン
 * ・Button1…
 * 使用データマップ
 * ・routeLimit…Int型。その区間の最高速度をkm単位、整数で指定。ただし0は制限解除扱い。
 * ・driverName…String型。運転士のMCIDを指定。
 * ・tascX…Double型。TASC機能で停車する位置のX座標を指定。
 * ・tascZ…Double型。TASC機能で停車する位置のZ座標を指定。
 */