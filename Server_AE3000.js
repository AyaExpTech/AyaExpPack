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
 * 必要な関数一覧
 * ・onUpdate(entity, scriptExecuter) … メインループ関数。毎tickこいつが呼び出される
 * ┣・funcAssist(entity, data) … 速度アシスト(減速+加速)機能の関数。
 * ┣・funcStop(entity, data) … 停車支援機能の関数。
 * ┣・funcAtacs(entity, data) … 車間維持機能の関数。
 * ┃┣・getRailMap(entity, x, y, z) … railMapを取得する関数。
 * ┃┗・getRMfromRP(entity, rp) … railPositionからrailMapを取得する関数。
 * ┗・funcEB(entity, data) … 非常制動機能の関数。
 * ・calcBrakingDistance(speed, notch) … 速度とノッチから制動距離を求める関数。
 * ・calcMaxSpeed(braking, notch) … 制動距離とノッチから速度を求める関数。
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

/**
 * メインループ関数。MOD本体から毎tick呼び出される。
 * @param {TileEntity} entity 列車のTileEntity
 * @param {any} scriptExecuter なにこれ…
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
    //空の配列を作成
    var data = [];
    //配列へ順番にdataを入れていく
    data = data.push(dataMap.getInt("limit"));
    data = data.push(dataMap.getInt("assistMode"));
    data = data.push(dataMap.getDouble("remain"));
    data = data.push(dataMap.getInt("atacs"));
    data = data.push(dataMap.getInt("eb"));
    data = data.push(dataMap.getDouble("deferPosX"));
    data = data.push(dataMap.getDouble("deferPosY"));
    data = data.push(dataMap.getDouble("deferPosZ"));
    data = data.push(dataMap.getDouble("beforePosX"));
    data = data.push(dataMap.getDouble("beforePosY"));
    data = data.push(dataMap.getDouble("beforePosZ"));
    //この時点で配列dataに全てのdataMapが入ったのでこれを読め

    /**
     * 車間維持機能用に在線情報を更新する
     */
    //まずdeferとnowのRailMapを取得して変数にぶちこむ
    nowRM = getRailMap(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v);
    deferRM = getRailMap(entity, data[5], data[6], data[7]);
    //deferとnowが異なる場合はbeforeをdeferにしなきゃいけない
    if (nowRM != deferRM) {
        dataMap.setDouble("beforePosX", data[5], SAVE);
        dataMap.setDouble("beforePosY", data[6], SAVE);
        dataMap.setDouble("beforePosZ", data[7], SAVE);
    }
    //必ずdeferを今の座標で上書き
    dataMap.setDouble("deferPosX", entity.field_70165_t, SAVE);
    dataMap.setDouble("deferPosY", entity.field_70163_u, SAVE);
    dataMap.setDouble("deferPosZ", entity.field_70161_v, SAVE);
    //この時点でdeferが今tickの座標、beforeが一個前のレール時点の座標になったので持ち越し可能

    /**
     * 配列ctrlsに各機能の要求ノッチを入れる
     * ctrls[0] … 速度アシスト
     * ctrls[1] … 停車支援
     * ctrls[2] … 車間維持
     * ctrls[3] … 非常制動
     */
    var ctrls = [];
    ctrls = ctrls.push(funcAssist(entity, data));
    ctrls = ctrls.push(funcStop(entity, data));
    ctrls = ctrls.push(funcAtacs(entity, data));
    ctrls = ctrls.push(funcEB(entity, data));
    /**
     * 条件分岐で変数controlにノッチを入れてうぇーい
     */
    var control = null;
    if (ctrl[3] != null) {
        control = ctrls[3];
    } else {
        if (ctrl[2] != null) {
            control = ctrls[2];
        } else {
            if (ctrl[1] != null) {
                control = ctrls[1];
            } else {
                control = ctrls[0];
            }
        }
    }
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
    //とりあえずミスを起こさないように現在の速度を求めとく
    var speed = entity.getSpeed() * 72;
    //制限速度をひっぱってくるのにわざわざdata[n]って書くの嫌だし見づらいので変数に出しときます
    var limit = data[0];
    if (data[1] == 1 || data[1] == 2) {
        //数値を返すのはONのとき
        if (limit < speed) {
            return -7;
        }
        if (entity.getNotch() == -7 && speed <= limit - 1) {
            return 0;
        }
        if (data[1] == 2 && speed <= limit - 3) {
            return 5;
        }
    }
    //この時点でreturnしてなかったらnullです
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
    //とりあえずミスを起こさないように現在の速度を求めとく
    var speed = entity.getSpeed() * 72;
    //remainはよく使うので変数で持ってきてください
    var remain = data[2];
    if (remain == 0) {
        if (entity.getNotch() == -7) {
            return -1;
        } else {
            return null;
        }
    }
    if (remain < 1 && speed == 0) {
        dataMap.setDouble("remain", 0.0, SAVE);
        return -7;
    }
    var brakeD = calcBrakingDistance(speed, -7);
    if (remain <= brakeD) {
        return -7;
    }
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
    //またlimitを持ってきます
    var limit = data[0];
    //limitが0以下だと困る気がするのでその場合10に読み替え
    if (limit <= 0) {
        limit = 10;
    }
    //ループ処理使って先行車両までの距離を求める必要が…
    // distanceFは前方車両までの距離(m)、distanceBはlimit km/hの制動距離(m)、findRailは探索中のレール、foundRailは一個前に探索してたレール
    var distanceF = 0;
    var distanceB = calcBrakingDistance(limit, -7);
    var findRail = getRailMap(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v);
    var foundRail = getRailMap(entity, data[8], data[9], data[10]);
    //条件はdistanceFよりdistanceBの方が大きい(まだ探索しなきゃいけない)間なのでそれ
    while (distanceF < distanceB) {
        var searchRailA = getRMfromRP(entity, findRail.getStartRP());
        var searchRailB = getRMfromRP(entity, findRail.getEndRP());
        //foundと一致しないほうが次に進むべきrail
        var nextRail = null;
        if (foundRail == searchRailA) {
            nextRail = searchRailB;
        }
        if (foundRail == searchRailB) {
            nextRail = searchRailA;
        }
        if (nextRail === null) {
            break;
        }
        foundRail = findRail;
        findRail = nextRail;
        // findRailについて考えなきゃいけなくて
        var onRail = findRail.isTrainOnRail(); // boolean型
        var length = findRail.length(); //Double…?
        if (onRail) {
            // isTrainOnRailがtrueならwhileからbrakeしなきゃいけなくて…
            brake;
        } else {
            // findRailのレール長を加算して再ループ
            distanceF = distanceF + length;
        }
    }
    //この時点でdistanceF<distanceBなら列車発見なのでatacsのB7判定の可能性がある
    //が、そうでないならこの機能がB7を出す必要性はない
    //というかそれ以前にこの機能がONじゃなかったらB7出さなくていい
    if (data[3] == 1) {
        if (distanceF < distanceB) {
            var max = calcMaxSpeed(distanceF, -7);
            if (max <= speed) {
                return -7;
            }
        }
    }
    return null;
}

/**
 * 非常制動機能の関数
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Array} data dataMapを取得したものをまとめてある配列
 */
function funcEB(entity, data) {
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
 * entityが乗ってるレールのrailMapを取得する関数 by Kaiz_JP
 * x,y,zをすべて指定するとその座標をもとにして取得するので前tickから座標を持ち越せば前tickのあれができます
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Double} x X座標(Double型)
 * @param {Double} y Y座標(Double型)
 * @param {Double} z Z座標(Double型)
 * @param {RailMap} return RailMapが返ってきます
 */
function getRailMap(entity, x, y, z) {
    var tileEntityRailBase;
    //x,y,zをもとに出すんで今の場所を指定したいときは以下のように呼び出してください
    //getRailMap(entity, entity.field_70165_t, entity.field_70163_u, entity.field_70161_v)
    //ここ、kaiz氏にもらったときはyに+1してたんだけどこれほんとにy+1必要か…？一回外してます
    tileEntityRailBase = TileEntityLargeRailBase.getRailFromCoordinates(entity.field_70170_p, x, y, z, 0);
    if (tileEntityRailBase != null) {
        var tileEntityRailCore = tileEntityRailBase.getRailCore();
        if (tileEntityRailCore instanceof TileEntityLargeRailSwitchCore) {
            return tileEntityRailCore.getSwitch().getNearestPoint(entity.getBogie(entity.getTrainDirection())).getActiveRailMap(entity.field_70170_p);
        } else {
            return tileEntityRailCore.getRailMap(entity.getBogie(entity.getTrainDirection()));
        }
    }
    return null;
}

/**
 * railPositionからrailMapを取得 by Kaiz_JP
 * @param {TileEntity} entity entity
 * @param {RailPosition} rp railPosition
 */
function getRMfromRP(entity, rp) {
    //rpはRailPosition worldはWorld
    var tileEntity = BlockUtil.getTileEntity(entity.field_70170_p, rp.getNeighborBlockPos()); //entity.field_70170_pがworld
    if (tileEntity instanceof TileEntityLargeRailBase) {
        return tileEntity.getRailMap(null);
        //ここでrailMapの取得が完了
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