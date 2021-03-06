/**
 * importPackage。こんだけあれば足りるだろ…
 */
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
importPackage(Packages.jp.ngt.ngtlib.block);
importPackage(Packages.jp.ngt.rtm.rail);
importPackage(Packages.jp.ngt.ngtlib.math);
importPackage(Packages.jp.ngt.rtm.rail.util);
importPackage(Packages.net.minecraft.init);
importPackage(Packages.net.minecraft.util.math);

/**
 * Aya-exp Train Support "AeTS" ver10.01
 * for Minecraft JE v1.12.2 + RealTrainMod ver2.x+
 * (Minecraft JE v1.7.10 + KaizPatchX 1.4+)
 */

/**
 * 使用するデータマップ一覧
 * ・コマンドで操作するデータマップ
 * @param {Int} limit 現在の制限速度。単位はkm/h
 * @param {Int} assistMode 速度アシスト機能のmode。0…OFF、1…減速のみ、2…減速+加速
 * @param {Double} remain 停止位置までの残り距離。単位はm
 * @param {Int} atacs 車間維持機能のmode。0…OFF、1…ON
 * @param {Int} eb 非常制動機能のmode。0…OFF、1…ON
 * ・コマンドでは操作しないデータマップ
 * @param {Double} deferPosX 常に1tick前のentityのX座標が入る。onUpdateで処理
 * @param {Double} deferPosY 常に1tick前のentityのY座標が入る。onUpdateで処理
 * @param {Double} deferPosZ 常に1tick前のentityのZ座標が入る。onUpdateで処理
 * @param {Double} beforePosX 前のレールを取得していた時点のentityのX座標が入る。onUpdateで処理
 * @param {Double} beforePosY 前のレールを取得していた時点のentityのY座標が入る。onUpdateで処理
 * @param {Double} beforePosZ 前のレールを取得していた時点のentityのZ座標が入る。onUpdateで処理
 */

/**
 * データマップはonUpdateで配列dataに入る。
 * 配列dataの対応表
 * 00…limit
 * 01…assistMode
 * 02…remain
 * 03…atacs
 * 04…eb
 * 05…deferPosX
 * 06…deferPosY
 * 07…deferPosZ
 * 08…beforePosX
 * 09…beforePosY
 * 10…beforePosZ
 */

function onUpdate(entity, scriptExecuter) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておけ
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;

    /**
     * dataMapを配列dataにまとめます、取得は1回で。
     */
    var data = [dataMap.getInt("limit"), dataMap.getInt("assistMode"), dataMap.getDouble("remain"), dataMap.getInt("atacs"), dataMap.getInt("eb"), dataMap.getDouble("deferPosX"), dataMap.getDouble("deferPosY"), dataMap.getDouble("deferPosZ"), dataMap.getDouble("beforePosX"), dataMap.getDouble("beforePosY"), dataMap.getDouble("beforePosZ")];
    //この時点で配列dataに全てのdataMapが入ったのでこれを読め

    /**
     * 車間維持機能用に在線情報を更新する
     */
    //まずdeferとnowのRailBaseを取得して変数に入れる
    nowRB = getRBfromPOS(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v);
    deferRB = getRBfromPOS(entity, data[5], data[6], data[7]);
    //deferとnowが異なる場合は線路切り替わったのでbeforeをdeferで更新。
    if (String(nowRB) != String(deferRB)) {
        dataMap.setDouble("beforePosX", data[5], SAVE);
        dataMap.setDouble("beforePosY", data[6], SAVE);
        dataMap.setDouble("beforePosZ", data[7], SAVE);
    }
    //必ずdeferを今の座標で上書き
    dataMap.setDouble("deferPosX", entity.field_70165_t, SAVE);
    dataMap.setDouble("deferPosY", entity.field_70163_u, SAVE);
    dataMap.setDouble("deferPosZ", entity.field_70161_v, SAVE);

    /**
     * 配列ctrlsに各機能の要求ノッチを入れる
     * ctrls[0] … 速度アシスト
     * ctrls[1] … 停車支援
     * ctrls[2] … 車間維持
     * ctrls[3] … 非常制動
     */
    var ctrls = [funcAssist(entity, data), funcStop(entity, data), funcAtacs(entity, data), funcEB(entity, data)];
    //変数controlに最終的なノッチを入れる
    var control = null;
    if (ctrls[3] != null) {
        //非常制動は最優先
        control = ctrls[3];
    } else {
        if (ctrls[2] != null) {
            //次に優先すべきは車間維持
            control = ctrls[2];
        } else {
            if (ctrls[1] != null) {
                //次に優先すべきは停車支援
                control = ctrls[1];
            } else {
                //最後に速度アシスト
                control = ctrls[0];
            }
        }
    }
    //で、最終的なノッチを適用する
    if (control != null) {
        entity.setNotch(control);
    }
}

/**
 * 速度アシスト機能の関数
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Array} data dataMapを取得したものをまとめてある配列
 */
function funcAssist(entity, data) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておけ
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;
    var speed = entity.getSpeed() * 72;
    //制限速度をひっぱってくるのにわざわざdata[n]って書くの嫌だし見づらいので変数に出しときます
    var limit = data[0];
    //そもそも数値を返すのはONのときだけなのでif書こう
    if (data[1] == 1 || data[1] == 2) {
        /**
         * 制限速度を超過しているときは必ず-7
         * 制限速度を1km/h以上下回っていてノッチが-7なら0(惰性)
         * 制限速度を3km/h以上下回っていてmode=2なら5
         */
        if (limit < speed) {
            return -7;
        }
        if (entity.getNotch() == -7 && speed < limit - 1) {
            return 0;
        }
        if (data[1] == 2 && speed < limit - 3) {
            return 5;
        }
    }
    //この時点でreturnしてなければnullを返してOK
    return null;
}

/**
 * 停車支援機能の関数
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Array} data dataMapを取得したものをまとめてある配列
 */
function funcStop(entity, data) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておけ
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;
    var speed = entity.getSpeed() * 72;
    //remainはよく使うので変数で持ってくる
    var remain = data[2];
    //remainが-100の状態をOFFとみなしてnullを先行で返す
    if (remain == -100) {
        return null;
    }
    //上のnullで抜けてなければONとみなして距離を減算
    dataMap.setDouble("remain", remain - entity.getSpeed(), SAVE);
    //残り1m未満ならB7で止めるかOFFにするかのどっちかです。オーバーランもここに含みます
    if (remain < 1) {
        if (speed == 0) {
            dataMap.setDouble("remain", -100.0, SAVE);
        } else {
            //AssistMode=2を1にする仕様にしないと止まったあとまたすぐ動いちゃう
            if (data[1] == 2) {
                dataMap.setInt("assistMode", 1, SAVE);
            }
        }
        //ここに書くことで残り1m未満のとき確実にここを抜けるのを防ぐ
        return -7;
    }
    //残り1m以上あるなら制動距離と残り距離を比較して必要ならブレーキ
    if (remain <= calcBrakingDistance(speed, -7)) {
        return -7;
    }
    //ここまでたどり着いてたらnull
    return null;
}

/**
 * 車間維持機能の関数
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Array} data dataMapを取得したものをまとめてある配列
 */
function funcAtacs(entity, data) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておけ
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;
    var speed = entity.getSpeed() * 72;
    //とりあえずONじゃなければ全部すっ飛ばしてnullでいいのでifで囲います
    if (data[3] == 1) {
        //またlimitを持ってきます
        var limit = data[0];
        //limitが0以下だと困る気がするのでその場合10に読み替え
        if (limit <= 0) {
            limit = 10;
        }
        //地獄の"先頭車両までの距離計測"でございます
        var fDis = 0; //最終的に前方車両までの距離になる
        var bDis = calcBrakingDistance(limit, -7); //(limit)km/hの制動距離
        //findの初期位置は現在位置、foundの初期位置はその一つ前
        //どちらもRailBaseが入ってるしRailBaseで比較していきます
        var findRB = getRBfromPOS(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v);
        var foundRB = getRBfromPOS(entity, data[8], data[9], data[10]);
        NGTLog.debug("find=" + findRB + ", found=" + foundRB);
        //このあとのwhileで使う変数を定義します
        var searchA;
        var searchB;
        var onRail;
        var length;
        //くそわかりづらいが前方車両までの距離が制動距離を上回るまでループなのでwhile文
        while (fDis < bDis) {
            //searchA,BにfindRBの隣のRailBaseを入れたいが経由地が多すぎる(Base→Core→Map→隣Position→隣Base)
            searchA = getRBfromRP(entity, getStartRPfromRM(entity, getRMfromRC(entity, getRCfromRB(entity, findRB))));
            searchB = getRBfromRP(entity, getEndRPfromRM(entity, getRMfromRC(entity, getRCfromRB(entity, findRB))));
            var rNext; //巻き上げます
            //foundRBじゃない方が次に進むべきRail
            NGTLog.debug("A=" + searchA + ", B=" + searchB + ", found=" + foundRB);
            if (String(foundRB) == String(searchA)) {
                rNext = searchB;
            }
            if (String(foundRB) == String(searchB)) {
                rNext = searchA;
            }
            //一応breakのパターン挟み込んでます
            if (rNext == null) {
                NGTLog.debug("null-break!(d=" + fDis + "m)");
                break;
            }
            //次のwhileを考えて移動するイメージ
            foundRB = findRB;
            findRB = rNext;
            //findRBからそのRailに列車がいるかとそのレールの長さを取得
            onRail = getRCfromRB(entity, findRB).isTrainOnRail(); //RailCoreからとれるっぽい
            length = getRCfromRB(entity, findRB).getLength //RailCoreからとれるっぽい
            NGTLog.debug("isOnRail=" + onRail + ",l=" + length + "m");
            if (onRail) {
                //isTrainOnRailがtrueだったらそこでwhileから強制breakです
                fDis = fDis + 2;
                NGTLog.debug("true-break!(d=" + fDis + "m)");
                break;
            } else {
                //足して再ループ
                fDis = fDis + length;
                NGTLog.debug("d=" + fDis + "m");
            }
        }
        //fDisの距離で止まれる最高速度を求めて現在速度と比較して必要ならブレーキ
        var max = calcMaxSpeed(fDis - 1, -7); //猶予1mとる
        NGTLog.debug("max=" + max + "km/h");
        //maxが5km/h切ってたらもう0と読み替えろ、別にいいだろそんくらい
        if (max < 5) {
            max = 0;
        }
        if (max < speed) {
            return -7;
        }
    }
    //ここまで来たらnull
    return null;
}

/**
 * 非常制動機能の関数
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Array} data dataMapを取得したものをまとめてある配列
 */
function funcEB(entity, data) {
    //もう書くまでもないでしょ
    if (data[4] == 1) {
        return -8;
    }
    return null;
}

/**
 * ///////////////////////////////////////////////////////////////
 * ここから子関数
 * ///////////////////////////////////////////////////////////////
 */

/**
 * 座標→RailBase
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Double} x X座標
 * @param {Double} y Y座標
 * @param {Double} z Z座標
 * @returns {RailBase} RailBase
 */
function getRBfromPOS(entity, x, y, z) {
    //x,y,zをもとに出すんで今の場所を指定したいときは以下のように呼び出してください
    //getRBfromPOS(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v)
    return TileEntityLargeRailBase.getRailFromCoordinates(entity.field_70170_p, x, y + 1, z, 0);
}

/**
 * RailBase→RailCore
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailBase} rb RailBase
 * @returns {RailCore} RailCore
 */
function getRCfromRB(entity, rb) {
    if (rb != null) {
        return rb.getRailCore();
    }
    return null;
}

/**
 * RailCore→RailBase
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailBase} rc RailCore
 * @returns {RailBase} RailBase
 */
function getRBfromRC(entity, rc) {
    if (rc != null) {
        return getRBfromRM(entity, getRMfromRC(entity, rc));
    }
    return null;
}

/**
 * RailMap→RailBase
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailMap} rm RailMap
 * @returns {RailBase} RailBase
 */
function getRBfromRM(entity, rm) {
    if (rm != null) {
        return rm.getRailBase();
    }
    return null;
}

/**
 * RailCore→RailMap
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailCore} rc RailCore
 * @returns {RailMap} RailMap
 */
function getRMfromRC(entity, rc) {
    if (rc instanceof TileEntityLargeRailSwitchCore) {
        return rc.getSwitch().getNearestPoint(entity.getBogie(entity.getTrainDirection())).getActiveRailMap(entity.field_70170_p);
    } else {
        return rc.getRailMap(entity.getBogie(entity.getTrainDirection()));
    }
}

/**
 * RailMap→RailPosition(StartRP)
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailMap} rm RailMap
 * @returns {RailPosition} Start側RailPosition
 */
function getStartRPfromRM(entity, rm) {
    if (rm != null) {
        return rm.getStartRP();
    }
}

/**
 * RailMap→RailPosition(EndRP)
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailMap} rm RailMap
 * @returns {RailPosition} End側RailPosition
 */
function getEndRPfromRM(entity, rm) {
    if (rm != null) {
        return rm.getEndRP();
    }
}

/**
 * RailPosition→RailBase
 * @param {TileEntity} entity 列車のTileEntity
 * @param {RailPosition} rp RailPosition
 * @returns {RailBase} RailBase
 */
function getRBfromRP(entity, rp) {
    //rpはRailPosition worldはWorld
    if (rp != null) {
        var x = rp.blockX;
        var y = rp.blockY;
        var z = rp.blockZ;
        var r = getRBfromPOS(entity, x, y, z);
        if (r instanceof TileEntityLargeRailNormalCore) {
            return getRBfromRC(entity, r);
        }
        return r;
    }
    return null;
}

/**
 * 指定されたノッチ・速度(単位はkm/h)の制動距離(単位はm)を返す関数。
 * @param {Double} speed 現在の速度(km/h)
 * @param {Double} notch ノッチ。負の数で。
 * @param {Double} return 制動距離
 */
function calcBrakingDistance(speed, notch) {
    var deceleration = -0.72 * notch; //減速度
    if (notch == -8) { deceleration = 14.4; }
    if (notch >= 0) { deceleration = 0.01; }
    var braking = (speed * speed) / (7.2 * deceleration)
    return braking;
}

/**
 * 指定されたノッチ・速度(単位はkm/h)の制動距離(単位はm)を返す関数。
 * @param {Double} braking 制動距離(m)
 * @param {Double} notch ノッチ。負の数で。
 * @param {Double} return 最大速度(km/h)
 */
function calcMaxSpeed(braking, notch) {
    var deceleration = -0.72 * notch; //減速度
    if (notch == -8) { deceleration = 14.4; }
    if (notch >= 0) { deceleration = 0.01; }
    var speed = Math.sqrt((36 / 5) * deceleration * braking);
    return speed;
}