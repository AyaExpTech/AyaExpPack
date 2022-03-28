/**
 * Aya-exp Train Support "AeTS" ver10.01
 * for Minecraft JE v1.12.2 + RealTrainMod ver2.x+
 * (Minecraft JE v1.7.10 + KaizPatchX 1.4+)
 */

//scriptExecuter.execCommand("tell @a " + nowRail);

//importPackage
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
importPackage(Packages.jp.ngt.ngtlib.block);
importPackage(Packages.jp.ngt.rtm.rail);
importPackage(Packages.jp.ngt.ngtlib.math);
importPackage(Packages.jp.ngt.rtm.rail.util); // RailMapBasic
importPackage(Packages.net.minecraft.init); // Blocks
importPackage(Packages.net.minecraft.util.math); // BlockPos (1.12.2)

/**
 * Mod側が1tick(20分の1秒)ごとに呼び出すメインループ関数。
 * @param {TileEntity} entity 列車のTileEntity
 * @param {any} scriptExecuter よくわからん。サーバーかプレイヤーの情報が入ってそう
 */
function onUpdate(entity, scriptExecuter) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておくべき部分です。
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;

    /**
     * よく使う(tick内)定数はここで宣言しちゃったほうが良さげ。dataMapからの取得回数も減らしたいね
     */
    var signalLimit = dataMap.getInt("brakeAssist"); //brakeAssistが投げてるLimit
    var speed = entity.getSpeed() * 72; //現在の速度(km/h)
    var isStAsOn = Boolean(dataMap.getInt("accelAssist"));
    var isBrAsOn = Boolean(dataMap.getInt("stopAssist"));
    var isEBon = Boolean(dataMap.getInt("eb"));

    /**
     * ATACSもどきを呼び出して制限速度を求めなきゃいけない
     */
    var limitSpeed;
    if (signalLimit = 0) {
        limitSpeed = atacs(70, entity); // 0なら70として計算してあげてください
    } else {
        if (signalLimit < 0) {
            limitSpeed = 0; // 負の数だったら明らか停止だろ
        } else {
            limitSpeed = atacs(signalLimit, entity);
        }
    }

    /**
     * 速度制限アシストと停車パターン支援からそれぞれが要求する動作をもってくる
     */
    var needNotchA = null; //速度制限アシスト
    var needNotchB = null; //停車パターン支援
    if (isBrAsOn) {
        needNotchA = funcBrakeAssist(entity, speed, limitSpeed);
    }
    if (isStAsOn) {
        needNotchB = funcStopAssist(entity, speed, limitSpeed);
    }

    /**
     * で、結局どういうマスコン操作が適しているのかを求めて実行！終わり！
     */
    var control;
    control = needNotchA;
    if (needNotchB != null) {
        control = needNotchB;
    }
    if (isEBon) {
        control = -8;
    }
    if (control != null) {
        entity.setNotch(control);
    }
}

/**
 * 速度制限アシスト機能の関数
 * @param {TileEntity} entity TileEntity 
 * @param {Double} speed 現在速度(km/h)
 * @param {Double} limit 制限速度(km/h)
 * @return {Int} とるべきノッチ
 */
function funcBrakeAssist(entity, speed, limit) {

}

/**
 * 停車パターン支援機能の関数
 * @param {TileEntity} entity TileEntity 
 * @param {Double} speed 現在速度(km/h)
 * @param {Double} limit 制限速度(km/h)
 * @return {Int} とるべきノッチ
 */
function funcStopAssist(entity, speed, limit) {

}

/**
 * 自動加速機能の関数
 * @param {TileEntity} entity TileEntity 
 * @param {Double} speed 現在速度(km/h)
 * @param {Double} limit 制限速度(km/h)
 * @return {Int} とるべきノッチ
 */
function funcAccelAssist(entity, speed, limit) {

}


/**
 * 車間維持機能の関数
 * @param {Int} limit 路線の制限速度。dm:brakeAssistの値。
 * @param {TileEntity} entity 列車のTileEntity
 * @param {Double} return ATACSもどきを踏まえた制限速度
 */
function atacs(limit, entity) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておくべき部分です。
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;

    /**
     * とりあえず前のtick時点でいたレールのrailMapと今のtick時点でいるレールのrailMapを取得して変数にぶちこみましょう
     * "defer_"ではじまるdataMapは前tickから持ち越す系データのやつです
     * @dataMap {Double} defer_posXd 前tick時点でのentityのX座標
     * @dataMap {Double} defer_posYd 前tick時点でのentityのY座標
     * @dataMap {Double} defer_posZd 前tick時点でのentityのZ座標
     */
    //めんどいんで配列にまとめときますね
    var deferPos = [dataMap.getDouble("defer_posXd"), dataMap.getDouble("defer_posYd"), dataMap.getDouble("defer_posZd")];
    //deferRailMapが「前tick時点のレールのrailMap」
    var deferRailMap = getRailMap(entity, deferPos[0], deferPos[1], deferPos[2]);
    //nowRailMapが「現tick時点でのレールのrailMap」
    var nowRailMap = getRailMap(entity, null, null, null);

    /**
     * defer_posX, defer_posY, defer_posZはもう使わなくて済むので次のtickのために今上書きします
     */
    dataMap.setDouble("defer_posXd", entity.field_70165_t, SAVE);
    dataMap.setDouble("defer_posYd", entity.field_70163_u, SAVE);
    dataMap.setDouble("defer_posZd", entity.field_70161_v, SAVE);

    /**
     * deferとnowのRailMapが異なる場合はbeforeRailMapを上書きしなきゃいけなくて…
     * @dataMap {Double} defer_posXb 前のrailMapを取得していた時点のentityのX座標
     * @dataMap {Double} defer_posYb 前のrailMapを取得していた時点のentityのY座標
     * @dataMap {Double} defer_posZb 前のrailMapを取得していた時点のentityのZ座標
     */
    var beforePos = [dataMap.getDouble("defer_posXb"), dataMap.getDouble("defer_posYb"), dataMap.getDouble("defer_posZb")];
    var beforeRailMap = getRailMap(entity, beforePos[0], beforePos[1], beforePos[2]);
    if (deferRailMap != nowRailMap) {
        // deferとnowが違う→所属レールが変化した→beforeRailMapとdefer_posNbを上書きしなきゃいけない
        beforeRailMap = deferRailMap;
        dataMap.setDouble("defer_posXb", beforePos[0], SAVE);
        dataMap.setDouble("defer_posYb", beforePos[1], SAVE);
        dataMap.setDouble("defer_posZb", beforePos[2], SAVE);
    }

    /**
     * この時点で必ず
     * beforeRailMap…一個前のRailMap
     * nowRailMap…今のRailMap
     * になってるはずです
     */

    /**
     * そしたらループ使って前方車両までの距離を求めます。
     * ただし前方車両が全く見つからなければそれでいいんで十分なところでやめます
     */
    // distanceFは前方車両までの距離(m)、distanceBはlimit km/hの制動距離(m)、findRailは探索中のレール、foundRailは一個前に探索してたレール
    var distanceF = 0;
    var distanceB = calcBrakingDistance(limit, -7);
    var findRail = nowRailMap;
    var foundRail = beforeRailMap;
    while (distanceF < distanceB) { //条件はdistanceFよりdistanceBの方が大きい(まだ探索しなきゃいけない)間なのでそれ
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
    //この時点でdistanceF<distanceBなら列車発見なのでatacsのlimitが優先、そうでなければlimitはlimitだろ
    if (distanceF < distanceB) {
        //calcBrakingDistanceの式を逆に使ってdistanceFの距離-5m(猶予)で止まれる最高速度を求める
        return ((Math.sqrt(362880) / 100) / Math.sqrt(distanceF));
    }
    return limit;
}

/**
 * ///////////////////////////////////////////////////////////////
 * ここから子プロセス的な関数
 * ///////////////////////////////////////////////////////////////
 */

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
 * entityが乗ってるレールのrailMapを取得する関数 by Kaiz_JP
 * x,y,zをすべて指定するとその座標をもとにして取得するので前tickから座標を持ち越せば前tickのあれができます
 * @param {TileEntity} entity 列車のTileEntity(必須)
 * @param {Double} x X座標(Double型。entityの現在地点のレールを取得する場合はnull)
 * @param {Double} y Y座標(Double型。entityの現在地点のレールを取得する場合はnull)
 * @param {Double} z Z座標(Double型。entityの現在地点のレールを取得する場合はnull)
 * @param {RailMap} return RailMapが返ってきます
 */
function getRailMap(entity, x, y, z) {
    var tileEntityRailBase;
    if ((x != null) && (y != null) && (z != null)) {
        // x,y,zがすべて指定されている場合はtileEntityRailBaseはその座標をもとにする
        tileEntityRailBase = TileEntityLargeRailBase.getRailFromCoordinates(entity.field_70170_p, x, y + 1.0, z, 0);
    } else {
        // ひとつでもnullならentityの現在位置を取得してそこをもとにする
        tileEntityRailBase = TileEntityLargeRailBase.getRailFromCoordinates(entity.field_70170_p, entity.field_70165_t, entity.field_70163_u + 1.0, entity.field_70161_v, 0);
    }
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
 * railPositionからrailMapを取得しないといけないやつ
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