基于星云链智能合约开发电子文档存证系统

星云是全球首个主网上线的区块链3.0公链，所有代码全部重新构建，比起以太坊更清晰，更简练，对开发者极度友好，智能合约语言基于当下最流行的javascript，现在我们就尝试基于星云链智能合约来设计一个电子存证系统。
第一步，系统设想：
    通过hash算法计算出电子文档的特征码，把该特征码、时间戳以及拥有者的钱包地址储存到智能合约中，由于只有钱包拥有者掌握钱包的私钥，一旦交易被确认，就可以通过这些信息来确认电子文档的权证归属。
第二步，准备工作：
    1、下载星云钱包：用于部署我们的智能合约，访问地址： https://github.com/nebulasio/web-wallet；
    2、生成测试地址：用于测试我们的存证功能，在钱包里生成两个钱包地址，每个钱包会有一个keystore文件，保存好这两个钱包keystore文件；
    3、领取测试NAS：部署合约以及发送存证交易需要消耗手续费，所以我们需要有测试的NAS，现在测试网络还不可以自己挖矿，但可以去官网领取，每个帐号领取10个NAS就足够使用来，访问地址：https://testnet.nebulas.io/claim/
    4、选一个比较顺手的JS编辑器：目前星云链没有提供智能合约的编辑和调试工具，所以这些只能自己解决了，JS作为当下最流行的语言，所以编辑工具还是很多的，我的电脑上装过vscode，虽然专业性并不高，但贵在轻量，试了一下还不错，至于调试，目前是有些麻烦，可以找一个在线调试js的网站，比如我找的这个：http://www.dooccn.com/nodejs/，将部分代码拷贝到网站上进行局部调试。如果谁有更好的方法，欢迎拿出来和大家一起讨论分享；
    
第三步，编写智能合约：
    官网的编写智能合约的教程：https://github.com/nebulasio/wiki/blob/master/tutorials/%5B%E4%B8%AD%E6%96%87%5D%20Nebulas%20101%20-%2003%20%E7%BC%96%E5%86%99%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6.md
    官方智能合约说明文档：https://github.com/nebulasio/wiki/blob/master/smart_contract.md
    下面是我写的智能合约合约：

'use strict';

// 定义账户数据
var Account = function(obj) {
    this.codes=[]
    if (typeof obj != "undefined") {
        obj = JSON.parse(obj)
        if(Object.prototype.toString.call(obj)=='[object Array]')
            this.codes=obj;
    }
}

Account.prototype = {
    toString: function () {
        return JSON.stringify(this.codes);
    },
    addCode:function(code){
        for(var i=0;i<this.codes.length;++i)
            if(code == this.codes[i])
                return;
        this.codes.push(code);
    },
    removeCode:function(code){
        for(var i=0;i<this.codes.length;++i) {
            if(code == this.codes[i]) {
                this.codes.splice(i,1);
                return;
            }
        }
    }
}

//定义的证书数据
var Certficate = function (obj) {
    if (typeof obj === "string") {
        obj = JSON.parse(obj)
    }
    if (typeof obj === "object") {
        this.time = obj.time;
        this.owner = obj.owner;
        this.text = obj.text;
    }
    else {
        this.time = "";
        this.owner = "";
        this.text = "";
    }
}

Certficate.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
}

//星云存证合约
var CertificateLib = function () {
    LocalContractStorage.defineProperties(this, {
        _name: null,                    //合约名字
        _creator: null                  //合约创建者
    });

    LocalContractStorage.defineMapProperties(this, {
        //定义证书的Map容器，用来存放每一个证书的信息
        "certficates": {
            parse: function (value) {
                return new Certficate(value);
            },
            stringify: function (o) {
                return o.toString();
            }
        },
        //定义账户的Map容器，用来存放每一个账户的证书信息
        "accounts": {
            parse: function (value) {
                return new Account(value);
            },
            stringify: function (o) {
                return o.toString();
            }
        }
    });
};

CertificateLib.prototype = {
    //智能合约初始化函数，只会在部署的时候执行一次
    init: function () {
        this._name = "Nebulas Certificate Library";
        this._creator = Blockchain.transaction.from;
    },

    // 智能合约的名字
    name: function () {
        return this._name;
    },

    // 查询某个账户里的所有证书
    listByOwner: function (owner) {
        return this.accounts.get(owner)||[];
    },

    // 登记证书，如果相同的认证代码已经被登记过了，将返回失败
    register: function (code, text) {
        if(!!this.certficates.get(code))
            throw new Error("The code has been registered!");

        var from = Blockchain.transaction.from;
        var certficate = new Certficate({
            "time":Blockchain.transaction.timestamp.toString(10),
            "owner":from,
            "text":text
        });
        this.certficates.set(code,certficate);
        var account = this.accounts.get(from) || new Account();
        account.addCode(code);
        this.accounts.set(from,account);
    },

    // 注销证书，如果证书不属于自己，将返回失败
    unregister: function (code) {
        var certficate = this.certficates.get(code);
        if(!certficate)
            throw new Error("Can't find the code!");

        var from = Blockchain.transaction.from;
        if(certficate.owner != from)
            throw new Error("The certficate isn't belone you!");

        this.certficates.del(code);

        var account = this.accounts.get(from);
        if (account) {
            account.removeCode(code);
            this.accounts.set(from,account);
        }
    },

    // 查看证书信息
    getInfo: function (code) {
        var certficate = this.certficates.get(code);
        if(!certficate)
            throw new Error("Can't find the code!");

        return certficate;
    },

    // 转让证书，如果证书不属于自己，将返回失败
    transfer: function (to, code) {
        var from = Blockchain.transaction.from;
        var certficate = this.certficates.get(code);
        if(!certficate)
            throw new Error("Can't find the code!");

        if(certficate.owner != from)
            throw new Error("The certficate isn't belone you!");
        certficate.owner = to;
        this.certficates.set(code,certficate);

        var account = this.accounts.get(from);
        if (account) {
            account.removeCode(code);
            this.accounts.set(from,account);
        }
        account = this.accounts.get(to) || new Account();
        account.addCode(code);
        this.accounts.set(to,account);
    }
};

module.exports = CertificateLib;

第四步，部署智能合约：
    打开星云的钱包，在页面右上角选择testnet，然后选择合约页面，选择部署标签，将代码复制到 “合约代码 :” 的编辑框中，然后点选择钱包，选择我们之前生成的钱包keystore文件，输入密码解锁钱包，点击测试，如果返回没有错误：{"result":"\"\"","execute_err":"","estimate_gas":"25266"}，那恭喜，你的智能合约已经部署好了。

    这里提一下，测试的时候是在本地执行的，不会消耗你的NAS，但部署是需要交易打包的，是要消耗NAS的。

第五步，测试智能合约：
    还是在星云钱包合约页面，选择“执行”标签，填入函数名和参数，选择好钱包并解锁，还是先点击测试，没问题就可以点提交测试功能了。

第六步，实现DApp前端：
    DApp前端可以有很多种的形式，可以是一个手机前端应用，也可以用web页面来展示，星云对这些方案都有支持，星云对接的SDK是neb.js，访问地址：https://github.com/nebulasio/neb.js
    我选择的静态页面+脚本来实现，其实星云的官方钱包就是一个DApp，推荐大家去看看它的实现方式对，这对构建前端会有很大的收益。
 
第七步，部署到主网：
    当所有功能测试没有问题了，就可以把合约部署到主网上了，部署到主网也非常简单，只需要在星云钱包的右上角testnet改成主网，然后重新部署一遍就可以了，当然你在星云主网上的钱包里一定要有NAS才行，否则没有燃料费，智能合约交易是发不出去的。

   本Dapp测试地址：https://certlib.github.io/。
