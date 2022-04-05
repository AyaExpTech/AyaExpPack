/**
 * Aya-exp Automatic Operated Driver "AeOD" ver3.0
 * for minecraft-ver1.12.2 or Kai-zPatchX
 */

 /**
  * データマップ・カスタムボタン
  * @param {Int} Button0…AeODのON/OFF(初期OFF、押してON)
  * @param {Int} Button1…通常0、回復運転1
  * @param {Int} limitSpeed…制限速度(km/h)
  * @param {Double} setDistance…次の駅までの距離(m)
  * @param {Int} doorOpen…停車時ドア開ける制御
  * @param {Int} posMode…精密停車モード。0でOFF、1でX参照、2で参照
  * @param {Double} stopPos…精密停車の座標。
  *
  * @param {Double} posDir…精密停車モードにおける進入方向を管理
  * @param {Int} isDriving…運転モードのときは1、停車モードのときは0。いじらない
  * @param {Double} remainDistance…残り距離(m)。コマンドから弄るのはsetの方
  */

//とりあえずimportPackage。たぶんこれで足りるでしょ?
importPackage(Packages.jp.ngt.ngtlib.util);
importPackage(Packages.jp.ngt.rtm.entity.train);
importPackage(Packages.jp.ngt.ngtlib.io);
importPackage(Packages.jp.ngt.rtm);
importPackage(Packages.jp.ngt.rtm.entity.train.util);
importPackage(Packages.jp.ngt.rtm.rail);
importPackage(Packages.jp.ngt.ngtlib.math);
importPackage(Packages.net.minecraft.util.math);

/**
 * 停車モード時の処理。言うてすることない。
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * @param {??????} dataMap onUpdateからの受け渡し
*/
function stopMode(entity, scriptExecuter, dataMap) {
  /*ドア操作。運転士がドア操作を行うことを考えて未指定のときと0指定のときは何もしないようにする。*/
  var doorDir = dataMap.getInt("doorOpen");
  entity.setNotch(-7)
  if (doorDir != 0) {
    entity.setTrainStateData(4, doorDir);
  }
  /*setDistanceに数値が入っている場合、運転を開始しなければいけないため運転モードへの移行処理を行う。*/
  var distance = dataMap.getDouble("setDistance");
  if (distance != 0) {
    dataMap.setInt("isDriving", 1, 3);
    dataMap.setDouble("remainDistance", distance, 3);
    dataMap.setDouble("setDistance", 0, 3);
    entity.setNotch(0);
    /*第三引数は3。ただし同期ありのsetになってしまい重くなるので頻繁に読まれるところにsetが来るなら変化時のみの変更のほうが軽い。
    とかいっときながら使わないのは確定で変化するから()*/
  }
}

/**
 * 残り距離の減算処理。
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * @param {??????} dataMap onUpdateからの受け渡し
*/
function subtractionDistance(entity, scriptExecuter, dataMap) {
  var beforeDistance = dataMap.getDouble("remainDistance");
  /*entity.getSpeed()がそのまま1tickで動いた距離っぽいので代入するパターン。誤差でるかも*/
  var afterDistance = beforeDistance - entity.getSpeed();
  dataMap.setDouble("remainDistance", afterDistance, 3);
}

/**
 * 指定されたノッチ・速度(単位はkm/h)の制動距離(単位はm)を返す関数。
 * @param {number} speed 現在の速度
 * @param {number} notch ノッチ。負の数で。
 * @param {number} return 制動距離
*/
function calcBrakingDistance(speed, notch){
  var deceleration = -0.72 * notch; //減速度
  if (notch == -8) {deceleration = 14.4;}
  if (notch >= 0) {deceleration = 0.01;}
  var braking = (speed * speed) / (7.2 * deceleration)
  return braking;
}

/**
 * 制限速度に合わせて定速走行するスクリプト(通常時)
 * @param {number} speed 現在の速度
 * @param {number} limit 制限速度
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * 少し余裕を持った運転をしてる。
*/
function normalDriveOp(speed, limit, entity, scriptExecuter){
  if (speed > limit) {
    entity.setNotch(-7);
  } else {
    if (speed > limit - 1) {
      entity.setNotch(0);
    }
    if (speed < limit - 3){
      entity.setNotch(5);
    }
  }
}

/**
 * 制限速度に合わせて定速走行するスクリプト(回復運転時)
 * @param {number} speed 現在の速度
 * @param {number} limit 制限速度
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * どうでもいいけど相当攻めてる。急な下り坂だとB1じゃ減速できないかもだけどたぶん大丈夫だろ
*/
function recoverDriveOp(speed, limit, entity, scriptExecuter){
  if (speed > limit + 0.5) {
    entity.setNotch(-7);
  } else {
    if (speed > limit + 0.4) {
      entity.setNotch(-1);
    } else {
      if (speed > limit + 0.3) {
        entity.setNotch(0);
      }
      if (speed < limit) {
        entity.setNotch(5);
      }
    }
  }
}

/**
 * 運転モード時の処理。言うてすることない。
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * @param {??????} dataMap onUpdateからの受け渡し
*/
function normalDriveMode(entity, scriptExecuter, dataMap) {
  /*isBrakeNeedに停車前の減速が必要かを代入*/
  var isBrakeNeed = false;
  var posModePlus = 10;
  if (dataMap.getInt("posMode") == 0) {
    posModePlus = 0;
  }
  if (calcBrakingDistance(entity.getSpeed() * 72, -7) + posModePlus > dataMap.getDouble("remainDistance")) {
    isBrakeNeed = true;
  }
  /*ブレーキ必要ならB7、いらないなら定速走行呼び出し*/
  if (isBrakeNeed) {
    entity.setNotch(-7);
  } else {
    var nowSpeed = entity.getSpeed() * 72;
    var nowLimit = dataMap.getInt("limitSpeed");
    if (dataMap.getInt("Button1") == 0) {
      normalDriveOp(nowSpeed, nowLimit, entity, scriptExecuter);
    } else {
      recoverDriveOp(nowSpeed, nowLimit, entity, scriptExecuter);
    }
  }
  //運転モードだが停車済みの場合データマップをなるべくリセットして停車モードに移行
  if (entity.getSpeed() < 1/72 && isBrakeNeed) {
    dataMap.setInt("isDriving", 0, 3);
    dataMap.setDouble("remainDistance", 0, 3);
    dataMap.setDouble("setDistance", 0, 3);
    dataMap.setInt("posDir", 0, 3);
    entity.setNotch(-7);
  }
}

/**
 * 運転モード時の処理。言うてすることない。
 * @param {??????} entity onUpdateからの受け渡し
 * @param {??????} scriptExecuter onUpdateからの受け渡し(なくても良い気がする)
 * @param {??????} dataMap onUpdateからの受け渡し
*/
function posDriveMode(entity, scriptExecuter, dataMap) {
  /*変数stopPosに停止位置を、nowPosに現在の位置を代入する*/
  var stopPos = dataMap.getDouble("stopPos");
  var nowPos = 0;
  /*以下、x参照かz参照かで分岐する処理*/
  if (dataMap.getInt("posMode") == 1) {
    /*x参照モード*/
    nowPos = entity.field_70165_t;
  }
  if (dataMap.getInt("posMode") == 2) {
    /*z参照モード*/
    nowPos = entity.field_70161_v;
  }

  /*残り距離をremainに入れる。停車初期にどっち側から進入したかで分岐処理*/
  var remain = 0;
  if (dataMap.getInt("posDir") == 0) {
    if (nowPos > stopPos) {
      dataMap.setInt("posDir", 1, 3);
    } else {
      dataMap.setInt("posDir", 2, 3);
    }
  }
  if (dataMap.getInt("posDir") == 1) {
    remain = nowPos - stopPos;
  }
  if (dataMap.getInt("posDir") == 2) {
    remain = stopPos - nowPos;
  }

  /*残り距離が25mを切っている場合、ここまでで入れたremainとかを参照してブレーキかける*/
  if (remain < 25 && dataMap.getDouble("remainDistance") < 120) {
    if (calcBrakingDistance(entity.getSpeed()*72, -7) < remain) {
      if (entity.getSpeed()*72 > 20) {
        entity.setNotch(-7);
      } else {
        entity.setNotch(0);
      }
    } else {
      entity.setNotch(-7);
    }
    /*運転モードだが停車済みの場合データマップをなるべくリセットして停車モードに移行*/
    if (entity.getSpeed() < 1/72) {
      dataMap.setInt("isDriving", 0, 3);
      dataMap.setDouble("remainDistance", 0, 3);
      dataMap.setDouble("setDistance", 0, 3);
      dataMap.setInt("posDir", 0, 3);
      entity.setNotch(-7);
    }
  } else {
    /*停車時以外はnormalオペと共通処理でOK(使いまわし最高)*/
    normalDriveMode(entity, scriptExecuter, dataMap);
  }
}

/**
 * RTM本体から毎tick呼び出される関数。この中に処理を書く。
 * @param {??????} enity 現在の速度
 * @param {??????} scriptExecuter ノッチ。負の数で。
*/
function onUpdate(entity, scriptExecuter){
  /*書く必要のあるやつ。今まで何度も忘れてきてdefinedで苦しんだから使わないにしてもとりあえず書いとけ。*/
  var resourceState = entity.getResourceState();
  var dataMap = resourceState.getDataMap();
  var resourceConfig = resourceState.getResourceSet().getConfig();

  /*AeODの起動チェック*/
  var isBooted = false;
  if (dataMap.getInt("Button0") == 1) {
    isBooted = true;
  }

  if (isBooted) {
    if (dataMap.getInt("isDriving") == 0) {
      stopMode(entity, scriptExecuter, dataMap);
    }
    if (dataMap.getInt("isDriving") == 1) {
      entity.setTrainStateData(4, 0);
      subtractionDistance(entity, scriptExecuter, dataMap);
      if (dataMap.getInt("posMode") == 0) {
        normalDriveMode(entity, scriptExecuter, dataMap);
      } else {
        posDriveMode(entity, scriptExecuter, dataMap);
      }
    }
  }
/*AeODメインループ ここまで*/
}
