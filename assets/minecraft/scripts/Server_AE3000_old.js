/**
 * Ayasaka-express Automatic operated Driver "AeOD" ver4.1
 * for Minecraft Java Edition ver 1.12.2 + RealTrainMod ver 2.x
 * (and Kai-zPatchX for Minecraft Java Edition ver 1.7.10 ?)
 */

/**
 * AeOD4は、綾急技研が開発した、
 * RealTrainModの列車の安全かつ正確な運行を支援するシステムです。
 * 同時に発表した「綾急信号(AeSS1)」との併用で、最大限の性能を発揮します。
 */

/**
 * 車両への実装に必要なカスタムボタン一覧
 * Button0…ATCおよびATO定速走行機能のON/OFF
 *  > 0…ATC_off/ATO_off
 *  > 1…ATC_on/ATO_off
 *  > 2…ATC_on/ATO_on
 * Button1…TASC機能のON/OFF
 *  > 0…TASC_off
 *  > 1…TASC_on
 * Button2…方向幕指定モードの切り替え(AE1500系用)
 *  > 0…RollSign_normal 通常の指定方法を優先
 *  > 1…RollSign_custom カスタムボタンによる指定を優先
 * Button3…方向幕指定ボタン 10の位(AE1500系用)
 *  > 0~8…"(10n)+"
 * Button4…方向幕指定ボタン 1の位(AE1500系用)
 *  > 0~9…"n"
 * Button5…パンタグラフの描画指定(AE1500系用)
 *  > 0…panta_off(Tc)
 *  > 1…panta_on(M'c)
 */

/**
 * 機能ごとのデータマップ一覧
 * 1.ATC/ATO
 *  1-1 > speedLimit (Int) 制限速度を指定します。停止信号には負の整数を推奨しています。
 *  1-2 > driver (String) その列車の"ATCが受け取った現示"の情報を送る相手のユーザー名を指定します。
 *  1-3 > beforeLimit (Int) 1tick前の制限速度です。変化したときにｳﾃｼに情報を送信するために使用します。
 * 2.AeSS
 *  2-1 > blockPos (String) 直近に通過した設備が送信した在線情報の座標をカンマ区切り「x,y,z」で受信します。
 *  2-2 > aspectPos (String) 直近に通過した設備が送信した次設備の現示ブロックの座標をカンマ区切りで受信します。
 *  2-3 > signalLimit (Int) 信号現示による制限を代入します。
 *  2-4 > beforePos (String) 1tick前のblockPosです。
 * 3.TASC
 *  3-1 > tascPos (String) 停車位置の座標を「x,z」のカンマ区切り形式で指定します。ずれ注意。
 * 4.ATO
 *  4-1 > autoOp (Int) ドア閉操作までのtick数を指定します。1sec=20tickです。
 *  4-2 > doorDir (Int) 開くドアの方向を指定します。0閉、1右、2左、3両
 */

//////////////////////////////////////////////////////////////////////////////////////////////////
//importPackage
//////////////////////////////////////////////////////////////////////////////////////////////////
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
importPackage(Packages.jp.ngt.rtm.rail);
importPackage(Packages.jp.ngt.ngtlib.math);
importPackage(Packages.net.minecraft.init); // Blocks
importPackage(Packages.net.minecraft.util.math); // BlockPos (1.12.2)

//////////////////////////////////////////////////////////////////////////////////////////////////
//メインループ
//////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Mod側が1tick(20分の1秒)ごとに呼び出すメインループ関数。
 * @param {TileEntity} entity 制御対象となる列車のentity情報だと思いたい
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
     * (1)変数nを定義し、各機能が要求するノッチを受け止める受け皿とします。
     */
    var n;

    /**
     * [a](2)speedLimitとsignalLimitを比較し、より厳しい方を制限速度として変数limitに代入します。
     *       また、制限速度に変化があれば運転手に伝えます。
     */
    var a_pL = dataMap.getInt("speedLimit");
    var a_iL = dataMap.getInt("signalLimit");
    var limit = -10;
    if (a_pL > a_iL && a_iL != 0) {
        limit = a_iL;
    } else {
        if (a_pL != 0) {
            limit = a_pL;
        }
    }
    //ここから変化があったときの送信
    var a_dB = dataMap.getInt("beforeLimit");
    if (a_dB != limit) {
        dataMap.setInt("beforeLimit", limit, SAVE);
        var a_cB = a_dB;
        var a_cN = limit;
        if (a_cB <= 0) { a_cB = "STOP"; } //信号の数字を気合いで読み替える。
        if (a_cN <= 0) { a_cN = "STOP"; }
        var a_cS = "tell " + dataMap.getString("driver") + " [AeOD4]>>Limit:(" + a_cB + "->)" + a_cN;
        scriptExecuter.execCommand(a_cS);
    }

    /**
     * (3)もしATCがONなら以下の処理を行います。
     */
    if (dataMap.getInt("Button0") != 0) {
        /**
         * (3-1)制限速度を0.4km/h以上こえていたらnに-7を代入します。
         */
        if (entity.getSpeed() * 72 - 0.4 > limit) {
            n = -7;
        }

        /**
         * (3-2)現在速度が制限速度-0.4(±0.2)km/hかつ今のノッチがB7ならnに0を代入します。
         */
        if (entity.getSpeed() * 72 + 0.6 > limit && entity.getSpeed() * 72 + 0.2 < limit && entity.getNotch() == -7) {
            n = 0;
        }

        /**
         * [b](3-3)直近に通過した綾急信号の地上設備に在線情報を送信します。
         */
        var b_dP = dataMap.getString("blockPos");
        var b_vP = b_dP.split(',');
        var b_cS = "setblock " + b_vP[0] + " " + b_vP[1] + " " + b_vP[2] + " minecraft:redstone_block";
        scriptExecuter.execCommand(b_cS);
        var b_bP = dataMap.getString("beforePos");
        if (b_bP != b_dP) {
            b_eA = b_bP.split(',');
            var b_eB = "setblock " + b_eA[0] + " " + b_eA[1] + " " + b_eA[2] + " minecraft:air";
            scriptExecuter.execCommand(b_eB);
            dataMap.setString("beforePos", b_dP, SAVE);
        }

        /**
         * [c](3-4)綾急信号の地上設備が指定している現示ブロックを参照し、綾急信号の制限速度を更新します。
         */
        var c_tX = dataMap.getString("aspectPos");
        if (c_tX == "0") { c_tX = "0,1,0" }
        var c_vP = commaToArray(c_tX);
        var c_sL = findGlass(Math.floor(c_vP[0]), Math.floor(c_vP[1]), Math.floor(c_vP[2]), entity);
        dataMap.setInt("signalLimit", c_sL, SAVE);
    }

    /**
     * (4)もしATOがONなら以下の処理を行います。
     */
    if (dataMap.getInt("Button0") == 2) {
        /**
         * (4-1) もし制限速度を3km/h以上下回っていたらnに5を代入します。
         */
        if (entity.getSpeed() * 72 + 3 < limit) {
            n = 5;
        }
    }

    /**
     * [d](5)もしTASCがONなら以下の処理を行います。
     */
    if (dataMap.getInt("Button1") == 1) {
        /**
         * (5-1)現在の速度からB7でブレーキをかけたときの制動距離を変数d_bDに代入します。
         */
        var d_bD = calcBrakingDistance(entity.getSpeed() * 72, -7);

        /**
         * (5-2)現在の位置から設定された停車位置までの直線距離を変数d_dDに代入します。
         */
        var d_nP = [entity.field_70165_t, entity.field_70161_v];
        var d_sX = dataMap.getDouble("tascPosX");
        var d_sZ = dataMap.getDouble("tascPosZ");
        var d_dI = [Math.abs(d_sX - d_nP[0]), Math.abs(d_sZ - d_nP[1])];
        var d_dD = Math.sqrt(Math.pow(d_dI[0], 2) + Math.pow(d_dI[1], 2));

        /**
         * (5-3)制動距離と直線距離を比較して、ブレーキが必要ならnに-7を代入します。
         */
        if (d_bD <= 10) {
            d_bD = d_bD + 5;
        }
        if (d_bD >= d_dD) {
            n = -7;
        }

        /**
         * (5-4)直線距離が1.3mを切っていたらnに-8を代入します。(誤差対策)
         */
        if (d_dD <= 1.3) {
            n = -8;
        }

        /**
         * (5-5)もし停車済みなら気合いでTASCをOFFにします。
         */
        if (entity.getSpeed() == 0) {
            dataMap.setInt("Button1", 0, SAVE);
            dataMap.setDouble("tascPosX", 0.0, SAVE);
            dataMap.setDouble("tascPosZ", 0.0, SAVE);
        }
    }

    /**
     * [e](6)もしATO自動乗降扱い機能がONかつ速度が0km/hなら以下の処理を行います。
     */
    if (dataMap.getInt("autoOp") >= 1 && entity.getSpeed() == 0) {
        var e_aA = dataMap.getInt("autoOp");
        /**
         * (6-1)もしドア閉までのtick数が1ならドアを閉めます。
         */
        if (e_aA == 1) {
            entity.setTrainStateData(4, 0);
        }

        /**
         * (6-2)もしドア閉までのtick数が2以上ならドアを指定方向に開けてnに-7を代入します。
         */
        if (e_aA >= 2) {
            var e_dD = dataMap.getInt("doorDir");
            entity.setTrainStateData(4, e_dD);
            n = -7;
        }

        /**
         * (6-3)autoOpを1減算します。
         */
        dataMap.setInt("autoOp", e_aA - 1, SAVE);
    }
    /**
     * (7)変数nがnullでないかつノッチの範囲内の場合はノッチをnにセットします。
     */
    if (n != null && n >= -8 && n <= 5) {
        entity.setNotch(n);
    }

    /**
     * (8)<AE1500系限定>方向幕カスタム指定を動作させます。
     */
    changeRollsign(entity);

}

//////////////////////////////////////////////////////////////////////////////////////////////////
//めんどくさい処理をコピペでやれる関数
//////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 指定されたノッチ・速度の制動距離を返します。
 * @param {number} speed 現在の速度(単位はkm/h)
 * @param {number} notch ノッチ。負の数で。
 * @param {number} return 制動距離(単位はm)
 */
function calcBrakingDistance(speed, notch) {
    var deceleration = -0.72 * notch; //減速度
    if (notch == -8) {
        deceleration = 14.4;
    }
    if (notch >= 0) {
        deceleration = 0.01;
    }
    var braking = (speed * speed) / (7.2 * deceleration)
    return braking * 1.05;
}

/**
 * 指定した座標のブロックに色ガラスがあれば対応した制限を、そうでない場合光速くらいの数字を返します。
 * 単位はkm/hです。また、色ガラスの対応は600V's signalと同じです。
 * @param {TileEntity} entity entityの情報っぽい
 * @param {Int} xyz それぞれ座標を指定する。
 * @return {Int} 信号に対応した制限速度。関数内で定義してるので必要に応じて書き換えてください。
 */
function findGlass(x, y, z, entity) {
    /*共通:これ書かないとまともに書けないのでコピペして全関数に書いとけ*/
    var world = entity.field_70170_p; //これなに()
    var metaNum = -1; //あとで番号いれる
    if (RTMCore.VERSION.indexOf("1.7.10") != -1) {
        //この1f内は1.7.10の場合の処理
        /*座標を丸める*/
        /*ブロックが色ガラスなら変数にmetadataを入れる*/
        var block = world.func_147439_a(x, y, z); //指定のブロックのブロックデータ。
        if (block === Blocks.field_150399_cn) {
            metaNum = world.func_72805_g(x, y, z);
        }
    } else {
        //このelse内は1.12.2の場合の処理
        var searchBlockPos = new BlockPos(x, y, z);
        var iBlockState = world.func_180495_p(searchBlockPos);
        var block = iBlockState.func_177230_c();
        var metaArray = iBlockState.func_177228_b().values().toArray(); // メタ情報取得(配列)
        if (block === Blocks.field_150399_cn) {
            metaNum = metaArray[0].func_176765_a();
        }
    }
    /*制限速度配列。[停止(R), 警戒(YY), 注意(Y), 減速(YG), 抑速(YGF), 進行(G), 高速進行(GG)]*/
    var limitSpeedArray = [-10, 25, 55, 75, 105, 250, 250];
    /*metaNumが-1なら光速くらいの数字を、そうでなければswitch文で対応して制限速度を返す*/
    var limitAtc = 300000;
    switch (metaNum) {
        case 14:
            limitAtc = limitSpeedArray[0];
            break; //R
        case 1:
            limitAtc = limitSpeedArray[1];
            break; //YY
        case 4:
            limitAtc = limitSpeedArray[2];
            break; //Y
        case 9:
            limitAtc = limitSpeedArray[3];
            break; //YG
        case 5:
            limitAtc = limitSpeedArray[4];
            break; //YGF
        case 13:
            limitAtc = limitSpeedArray[5];
            break; //G
        case 11:
            limitAtc = limitSpeedArray[6];
            break; //GG
        default:
            break;
    }
    return limitAtc;
}

/**
 * カンマ区切りで書かれた「x,y,z」形式の文字列を配列に変換します。
 */
function commaToArray(t) {
    var i = t;
    o = i.split(',');
    return o;
}

/**
 * 方向幕をカスタムボタン3つで動かします。
 * @param {TileEntity} entity 制御対象となる列車
 */
function changeRollsign(entity) {
    /*共通:これ書かないと脳死で書けないのでコピペしろ*/
    var resourceState = entity.getResourceState();
    var dataMap = resourceState.getDataMap();
    var SAVE = 3;
    /*変数に参照するボタン名を入れる*/
    var select = "Button2";
    var tenth = "Button3";
    var ones = "Button4";
    /*signNumberに数字を入れる。法則は察してくれ。強いて言うなら0始まりの89まで。*/
    var button2 = dataMap.getInt(select);
    var button3 = dataMap.getInt(tenth);
    var button4 = dataMap.getInt(ones);
    var signNumber = button3 * 10 + button4;
    dataMap.setInt("signNum", signNumber, SAVE);
    /*Button2が0の場合は通常選択を反映し、カスタムボタンはそれを参照して同期するような挙動をとる。*/
    if (button2 == 0) {
        var nowSign = entity.getTrainStateData(8);
        button3 = Math.floor(nowSign / 10);
        button4 = nowSign - button3 * 10;
        dataMap.setInt("Button3", button3, SAVE);
        dataMap.setInt("Button4", button4, SAVE);
    }
    /*Button2が1の場合はボタンの選択を反映し、方向幕の指定は受け付けない(というか上書きする)*/
    if (button2 == 1) {
        entity.setVehicleState(TrainState.getStateType(8), signNumber);
    }
}