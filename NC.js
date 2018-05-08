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