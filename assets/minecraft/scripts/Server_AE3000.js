/**
 * Aya-exp Train Support "AeTS" ver10.01
 * for Minecraft JE v1.12.2 + RealTrainMod ver2.x+
 * (Minecraft JE v1.7.10 + KaizPatchX 1.4+)
 */

//importPackage
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
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
     * とりあえず今走ってるレールを取得してStringに変えてみたい
     */
    var nowRail = getNowRailMap(entity);
    if (dataMap.getInt("test") == 1) {
        //scriptExecuter.execCommand("tell @a " + nowRail);
        NGTLog.debug("1:" + nowRail);
        NGTLog.debug("2:" + nowRail.getLength());
        dataMap.setString("testB", nowRail, SAVE);
        var testC = dataMap.getString("testB");
        NGTLog.debug("3:" + testC);
        var testD = testC.slice(21);
        //var testE = testD.getLength();
        //NGTLog.debug("4:" + testE);
    }
}

/**
 * entityが乗ってるレールのrailMapを取得する関数
 * by Kaiz_JP
 * @param {TileEntity} entity 列車のTileEntity
 */
function getNowRailMap(entity) {
    var tileEntityRailBase = TileEntityLargeRailBase.getRailFromCoordinates(entity.field_70170_p, entity.field_70165_t, entity.field_70163_u + 1.0, entity.field_70161_v, 0);
    if (tileEntityRailBase != null) {
        var tileEntityRailCore = tileEntityRailBase.getRailCore();
        if (tileEntityRailCore instanceof TileEntityLargeRailSwitchCore) {
            return tileEntityRailCore.getSwitch().getNearestPoint(entity.getBogie(entity.getTrainDirection())).getActiveRailMap(entity.field_70170_p);
        } else {
            return tileEntityRailCore.getRailMap(entity.getBogie(entity.getTrainDirection()));
        }
    }
    return 1;
}

/**
 * 車間維持機能の関数
 * @param {Int} limit 路線の制限速度。dm:brakeAssistの値。
 * @param {TileEntity} entity 列車のTileEntity
 */
function atacs(limit, entity) {
    /**
     * 共通で書かないと"XXX is not defined"をやらかしまくるのでコピペしておくべき部分です。
     */
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;

    /**
     * とりあえず今走ってるレールを取得してStringに変えてみたい
     */
    var nowRail = getNowRailMap(entity);
    if (dataMap.getInt("test") == 1) {
        scriptExecuter.execCommand("tell @a " + toString(nowRail));
    }
}