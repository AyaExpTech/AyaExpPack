var renderClass = "jp.ngt.rtm.render.VehiclePartsRenderer";
importPackage(Packages.org.lwjgl.opengl);
importPackage(Packages.jp.ngt.rtm.render);

//余計なことを考えるのがめんどくさい人(僕)のためのimportPackageセット。
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
importPackage(Packages.jp.ngt.rtm.rail);
importPackage(Packages.jp.ngt.ngtlib.math);
importPackage(Packages.net.minecraft.init);
importPackage(Packages.net.minecraft.util.math);

//##### オブジェクト定義 ####################
function init(par1, par2) {
    //車体
    body = renderer.registerParts(new Parts("body", "body2", "cab", "lightF", "lightB", "door", "Speed", "Controller", "Display"));
    lightF = renderer.registerParts(new Parts("lightF"));
    lightB = renderer.registerParts(new Parts("lightB"));
    door_LF = renderer.registerParts(new Parts("doorFL"));
    door_RF = renderer.registerParts(new Parts("doorFR"));
    door_LB = renderer.registerParts(new Parts("doorBL"));
    door_RB = renderer.registerParts(new Parts("doorBR"));
    alpha = renderer.registerParts(new Parts("alpha"));
    door_LFa = renderer.registerParts(new Parts("doorFL1"));
    door_RFa = renderer.registerParts(new Parts("doorFR1"));
    door_LBa = renderer.registerParts(new Parts("doorBL1"));
    door_RBa = renderer.registerParts(new Parts("doorBR1"));
    seatL1 = renderer.registerParts(new Parts("seatL1"));
    seatL2 = renderer.registerParts(new Parts("seatL2"));
    seatR1 = renderer.registerParts(new Parts("seatR1"));
    seatR2 = renderer.registerParts(new Parts("seatR2"));

    //パンタ
    pantabase = renderer.registerParts(new Parts("panta_C2"));
    pantaC21 = renderer.registerParts(new Parts("panta_C2_1"));
    pantaC22 = renderer.registerParts(new Parts("panta_C2_2"));
    pantaC23 = renderer.registerParts(new Parts("panta_C2_3"));
    pantaC24 = renderer.registerParts(new Parts("panta_C2_4"));
    pantaC25 = renderer.registerParts(new Parts("panta_C2_5"));
}


function MCVersionChecker() {
    var version = RTMCore.VERSION;
    if (version.indexOf("1.7.10") >= 0) return "1.7.10";
    else if (version.indexOf("2.0") >= 0) return "1.8.9";
    else if (version.indexOf("2.1") >= 0) return "1.9.4";
    else if (version.indexOf("2.2") >= 0) return "1.10.2";
    else if (version.indexOf("2.4") >= 0) return "1.12.2";
    else return "unknown";
}

//##### render ####################
function render(entity, pass, par3) {
    //数値設定
    var doorMove = 0.64; //ドア開閉距離(m)
    var pantaDistance = 7.0; //パンタ中心の前後位置(m)
    var pantaType = "Normal"; //パンタ高(Normal:標準-格納 / W51:W51-格納 / Compatible:標準-W51)
    var onUpdateTick = false;

    GL11.glPushMatrix();

    //通常描画
    if (pass == 0) {
        onUpdateTick = detectTick(entity);
        body.render(renderer);
        if (entity != null) {
            var dataMap = entity.getResourceState().getDataMap();
            if (isPantaRender(entity)) {
                pantabase.render(renderer);
            }
        }
        render_2WAYseat(entity, onUpdateTick);
        render_door(entity, doorMove);
        render_light(entity);
        render_panta(entity, pantaDistance, pantaType);
    }

    //半透明描画
    if (pass == 1) {
        alpha.render(renderer);
    }

    //発光部描画
    if (pass > 1) {
        onUpdateTick = detectTick(entity);
        body.render(renderer);
        if (entity != null) {
            var dataMap = entity.getResourceState().getDataMap();
            if (isPantaRender(entity)) {
                pantabase.render(renderer);
            }
        }
        render_2WAYseat(entity, onUpdateTick);
        render_light(entity);
        render_door(entity, doorMove);
    }

    GL11.glPopMatrix();
}

//##### render_ライト ####################
function render_light(entity) {

    var lightMove = 0;

    try {
        lightMove = (entity.seatRotation) / 45;
    } catch (e) {}


    if (lightMove < 0) {
        GL11.glPushMatrix();
        lightF.render(renderer);
        GL11.glPopMatrix();
    } else {
        GL11.glPushMatrix();
        lightB.render(renderer);
        GL11.glPopMatrix();
    }

}

//##### 車両情報取得 ###########################
function MCCTS(entity, par1) {
    var r;
    try {
        switch (par1) {
            case "entityID":
                r = entity.func_145782_y();
                break;
            case "tick":
                r = renderer.getTick(entity);
                break;
        }
    } catch (e) {}
    return r;
}

//##### DataIDシフト管理 #####################
function MCCIDS(par1) {
    var r;
    switch (par1) {
        case "tick":
            r = 1;
            break;
        case "mode1":
            r = 2;
            break;
        case "mode2":
            r = 3;
            break;
    }
    return r;
}

//##### tick管理 #############################
function detectTick(entity) {
    var entityID = MCCTS(entity, "entityID"),
        tick = MCCTS(entity, "tick"),
        prevTick = renderer.getData(entityID << MCCIDS("tick"));
    renderer.setData(entityID << MCCIDS("tick"), tick);
    if (tick != prevTick) return true;
    return false;
}

function render_2WAYseat(entity, onUpdateTick) {

    var varsion = MCVersionChecker();
    var seat_r = 0;
    var seatmode = 0;
    var mode_fL = 0;
    var mode_fR = 0;
    var s_mode1 = 0;
    var s_mode2 = 0;
    var pos_r = 0.97; //クロス時の回転軸(デフォルトは0.99)
    var mc_sd = 0.16; //モードチェンジ時の椅子移動距離(デフォルトは0.16)
    var mc_bd = 0.15; //モードチェンジ時の台座移動距離(デフォルトは0.15)
    var stpos = 1.0; //真ん中のグループの最前席の中心座標
    var seatdistance = 1; //シートピッチ
    var gloupdistance = 4.86; //グループ数ピッチ
    var seatcount = 3; //席数
    var gloupcount = 3; //グループ数

    var entityID = MCCTS(entity, "entityID");



    if (entity != null) {
        if (varsion == "1.7.10" || varsion == "1.8.9" || varsion == "1.9.4") {
            seatmode = entity.getTrainStateData(11);
        } else {
            seatmode = entity.getVehicleState(TrainState.getStateType(11));
        }
    }


    try {
        if (entity != null) {
            if (varsion == "1.12.2") {
                seat_r = (entity.seatRotation);
            } else {
                seat_r = (entity.seatRotation) / 45;
            }
        }
    } catch (e) {}


    switch (seatmode) {
        case 0:
            s_mode1 = 0;
            s_mode2 = 1;
            break;
        case 1:
            s_mode1 = 1;
            s_mode2 = 1;
            break;
        default:
            s_mode1 = 1;
            s_mode2 = 0;
            break;
    }


    var mode1 = renderer.getData(entityID << MCCIDS("mode1"));
    var mode2 = renderer.getData(entityID << MCCIDS("mode2"));

    //誤差による振動防止
    mode1 = mode1 * 1000;
    mode1 = Math.round(mode1);
    mode1 = mode1 / 1000;

    mode2 = mode2 * 1000;
    mode2 = Math.round(mode2);
    mode2 = mode2 / 1000;

    if (onUpdateTick == true) {
        if (s_mode1 > mode1) {
            mode1 = mode1 + 0.05;
        } else if (s_mode1 < mode1) {
            mode1 = mode1 - 0.05;
        }

        if (s_mode2 > mode2) {
            mode2 = mode2 + 0.05;
        } else if (s_mode2 < mode2) {
            mode2 = mode2 - 0.05;
        }
    }

    renderer.setData(entityID << MCCIDS("mode1"), mode1);
    renderer.setData(entityID << MCCIDS("mode2"), mode2);

    var mode_fL = mode1;
    var mode_fR = mode1;
    var rote1 = -90 * seat_r * mode_fL;
    var rote2 = -90 * -seat_r * mode_fR;

    for (var ss1 = 0; ss1 < gloupcount; ss1++) {
        for (var ss2 = 0; ss2 < seatcount; ss2++) {
            GL11.glPushMatrix();
            GL11.glTranslatef(-mc_sd * mode_fL, 0.0, 0.0);
            GL11.glTranslatef(-0.10 * (1 - (seat_r * seat_r)) * mode_fL, 0.0, 0.0);
            GL11.glTranslatef(0.0, 0.0, (-gloupdistance * (ss1) + gloupdistance));
            GL11.glTranslatef(0.0, 0.0, (-seatdistance * (ss2) + stpos));
            renderer.rotate(rote1, 'Y', pos_r, 0.0, 0.0);
            seatL1.render(renderer);
            GL11.glPopMatrix();

            GL11.glPushMatrix();
            GL11.glTranslatef(-mc_bd * mode_fL, 0.0, 0.0);
            GL11.glTranslatef(0.0, 0.0, (-gloupdistance * (ss1) + gloupdistance));
            GL11.glTranslatef(0.0, 0.0, (-seatdistance * (ss2) + stpos));
            seatL2.render(renderer);
            GL11.glPopMatrix();


            GL11.glPushMatrix();
            GL11.glTranslatef(mc_sd * mode_fR, 0.0, 0.0);
            GL11.glTranslatef(0.10 * (1 - (seat_r * seat_r)) * mode_fR, 0.0, 0.0);
            GL11.glTranslatef(0.0, 0.0, (-gloupdistance * (ss1) + gloupdistance));
            GL11.glTranslatef(0.0, 0.0, (-seatdistance * (ss2) + stpos));
            renderer.rotate(rote2, 'Y', -pos_r, 0.0, 0.0);
            seatR1.render(renderer);
            GL11.glPopMatrix();

            GL11.glPushMatrix();
            GL11.glTranslatef(mc_bd * mode_fR, 0.0, 0.0);
            GL11.glTranslatef(0.0, 0.0, (-gloupdistance * (ss1) + gloupdistance));
            GL11.glTranslatef(0.0, 0.0, (-seatdistance * (ss2) + stpos));
            seatR2.render(renderer);
            GL11.glPopMatrix();
        }
        ss2 = 0;
    }
    ss1 = 0;


}

//##### render_ドア ####################
function render_door(entity, doorMove) {

    var entityID = MCCTS(entity, "entityID");
    var doorMoveL = 0.0,
        doorMoveR = 0.0;
    var mode2 = renderer.getData(entityID << MCCIDS("mode2"));

    try {
        doorMoveL = renderer.sigmoid(entity.doorMoveL / 60) * doorMove;
        doorMoveR = renderer.sigmoid(entity.doorMoveR / 60) * doorMove;
    } catch (e) {}

    GL11.glPushMatrix();
    GL11.glTranslatef(0.0, 0.0, doorMoveL * mode2);
    door_LF.render(renderer);
    GL11.glPopMatrix();

    GL11.glPushMatrix();
    GL11.glTranslatef(0.0, 0.0, -doorMoveL * mode2);
    door_LB.render(renderer);
    GL11.glPopMatrix();

    GL11.glPushMatrix();
    GL11.glTranslatef(0.0, 0.0, doorMoveR * mode2);
    door_RF.render(renderer);
    GL11.glPopMatrix();

    GL11.glPushMatrix();
    GL11.glTranslatef(0.0, 0.0, -doorMoveR * mode2);
    door_RB.render(renderer);
    GL11.glPopMatrix();
}

//##### render_パンタ ####################
function render_panta(entity, pantaDistance, pantaType) {

    var pantaState = 0.0,
        pDis = pantaDistance;

    try {
        pantaState = renderer.sigmoid(entity.pantograph_F / 40);
    } catch (e) {}

    switch (pantaType) {
        case "W51":
            var pCro1 = pantaState * 15 + 14,
                pCro2 = pantaState * 35 + 24,
                pCro4 = pantaState * 36 + 24,
                pCro5 = pantaState * 38 + 28;
            break;
        case "Compatible":
            var pCro1 = pantaState * 14,
                pCro2 = pantaState * 24,
                pCro4 = pantaState * 24,
                pCro5 = pantaState * 28;
            break;
        default:
            var pCro1 = pantaState * 29,
                pCro2 = pantaState * 59,
                pCro4 = pantaState * 60,
                pCro5 = pantaState * 66;
            break;
    }

    if (entity != null) {
        var dataMap = entity.getResourceState().getDataMap();
        if (isPantaRender(entity)) {
            pantabase.render(renderer);

            //パンタC2
            GL11.glPushMatrix();
            renderer.rotate(pCro1, 'X', 0.0, 3.0118, -pDis - 0.314);
            pantaC21.render(renderer);
            GL11.glPushMatrix();
            renderer.rotate(-pCro4, 'X', 0.0, 3.6084, -pDis + 0.7523);
            pantaC24.render(renderer);
            GL11.glPopMatrix();
            renderer.rotate(-pCro2, 'X', 0.0, 3.7151, -pDis + 0.8641);
            pantaC22.render(renderer);
            GL11.glPushMatrix();
            renderer.rotate(pCro2 - pCro1, 'X', 0.0, 4.5998, -pDis - 0.6186);
            pantaC23.render(renderer);
            GL11.glPopMatrix();
            renderer.rotate(pCro5, 'X', 0.0, 3.5258, -pDis + 0.9758);
            pantaC25.render(renderer);
            GL11.glPopMatrix();
        }
    }
}

//##### パンタグラフを描画するかどうかはここで記述 #########################
function isPantaRender(entity) {
    var i = entity.getFormation().getEntry(entity).entryID;
    return !(i & 1);
}