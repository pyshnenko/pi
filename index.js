//test
require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TG_TOKEN);
const axiosUrl = 'https://spamigor.site:4014/api';
const axiosToken = process.env.AXIOS_TOKEN;
const Markup = require("telegraf/markup.js");
const Gpio = require('pigpio').Gpio;
const os = require( 'os' );
const fs = require("fs");
let ni = os.networkInterfaces( );
const axios = require('axios');
const apiKey = process.env.API_KEY;
let imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');
const WebSocketClient = require('websocket').client;
const socketPort = '8080/';
let socket;

let client = new WebSocketClient();
let needReb = false;
let needRest = false;
let needPull = false;
let needPush = false;
let gitRes = '';

let configIMAP = {
    imap: {
        user: process.env.MAILLOG,
        password: process.env.MAILPASS,
        host: 'imap.mail.ru',
        port: 993,
        tls: true,
        authTimeout: 3000
    }
};
let emailBuf = [];
let city = 'Moscow';
let regexp = /^[a-z\s]+$/i;
let reg = /^[а-яёa-z]*$/i;

let admin = [];
admin[0] = 209103348;
notRoot = [];
let lostId = [];
let checkLostId = true;
let logSet = true;
let idHistory = [];
let newAdmin = {
	idSetter: [],
	idSave: [],
	idDeletter: [],
	idDelete:[]
}
let timeDelay = 500;

let photoUrl = {
	id: [],
	url: []
};

const configR = {
	lang: "rus",
	oem: 1,
	psm: 3,
};

const configE = {
	lang: "eng",
	oem: 1,
	psm: 3,
};

fs.access("admins.txt", function(error){
    if (error) {
        console.log("Файл не найден");
		fs.open('admins.txt', 'w', (err) => {
			if(err) throw err;
			console.log('File created');
		});
    } else {
        console.log("Файл найден");
		let fileContent = fs.readFileSync("admins.txt", "utf8");
		let userBuffer = {};
		if (JSON.parse(fileContent).total!=0) {
			userBuffer = JSON.parse(fileContent);
			admin=userBuffer.admins;
			idHistory = userBuffer.historyId;
			newAdmin = userBuffer.newAdmin;
			if (userBuffer.hasOwnProperty('timeDelay')) timeDelay = userBuffer.timeDelay;
			if (userBuffer.hasOwnProperty('notRoot')) notRoot = userBuffer.notRoot;
			if (userBuffer.hasOwnProperty('logSet')) logSet = userBuffer.logSet;
		}
    }
});

fs.access("logFile.txt", function(error){
    if (error) {
        console.log("Файл не найден");
		fs.open('logFile.txt', 'w', (err) => {
			if(err) throw err;
			console.log('File created');
		});
    }
});

fs.access("logFilePhoto.txt", function(error){
    if (error) {
        console.log("Файл не найден");
		fs.open('logFilePhoto.txt', 'w', (err) => {
			if(err) throw err;
			console.log('File created');
		});
    }
});


let LEDblue = new Gpio(2, {mode: Gpio.OUTPUT});
let LEDred = new Gpio(3, {mode: Gpio.OUTPUT});
let LEDonrel = new Gpio (4, {mode: Gpio.OUTPUT});
let LEDdoor = new Gpio (17, {mode: Gpio.OUTPUT});
let red=0, blue=0, rel=0, door=1;
let myip = ni.wlan0[0].address;

setTimeout(() => {
	door=0;
	console.log('Запущено')}, 1000
);
checkMessage();
setInterval(() => {
	let data = fs.readFileSync("gitPull.txt", "utf8");
	console.log(data);
	if (data.substr(0, 5) != 'false') {
		gitRes=data;
		fs.writeFile("gitPull.txt", 'false', function(error) {
			if (error) console.log(error)
		});
	}
	try { checkMessage();}
	catch (err) {console.log('nop');};
	if (emailBuf.length>0) {
		let pos = emailBuf.length-1;
		bot.telegram.sendMessage(admin[0], `Получено письмо: ${emailBuf[pos].subject}\n\nс текстом: ${emailBuf[pos].text}\n\n отправитель:\n${emailBuf[pos].from.value[0].address}`);
		if ((emailBuf[pos].from.value[0].address==='noreply@rossetimr.ru')&&(emailBuf[pos].subject.includes('Уведомление'))&&(emailBuf[pos].text.includes('Хлябово'))) 
			bot.telegram.sendMessage(admin[0], emailBuf[pos].text);
			/*for (let i=0; i<notRoot.length; i++)
				bot.telegram.sendMessage(notRoot[i], emailBuf[pos].text);*/
		emailBuf.splice(pos, 1);
	}
}, 1*60*1000);

setInterval(() => {
	let date = new Date();
	let mDate = Math.floor(Number(date)/1000);
	let checkReb;
	needReb ? checkReb = 'true' : checkReb = 'false';
	let buf = `${checkReb}\n${mDate}\n`;
	if (needPull) {
		buf+='gitPull=true\n';
		needPull = false;
	}
	if (needPush) {
		buf+='gitPush=true\n';
		needPush = false;
	}
	if (needRest) buf += 'restart\n';
	fs.writeFile("rebFile.data", buf, function(error) {
		if(error) throw error;
		console.log('write done');
	});
}, 2.5*60*1000);

LEDblue.digitalWrite(blue);
LEDred.digitalWrite(red);
LEDonrel.digitalWrite(rel);

bot.start((ctx) => {
	socket.send(`TM: pi: ${ctx.from.id}: start`);
	ctx.reply('Привет. Я бот для упрощения жизни');
	if ((admin.includes(ctx.from.id))||(notRoot.includes(ctx.from.id))) {
		if (admin.includes(ctx.from.id))
			ctx.replyWithHTML(
				'Задержка задается через !~\nзапись лога: $!~старт\nостановить запись: $!~стоп\nлог: $!~лог\nВот клавиатура для всякого\n',
				keyboard())
		else 
			ctx.replyWithHTML(
				'Вот кнопка для шлагбаума\n',
				Markup.keyboard([
					['_открыть шлагбаум_']
				]).extra())
	}
	else {
		ctx.reply('Я не нахожу Вас в списках. Свяжитесь с администратором и сообщите ему свой идентификатор:\n' + (ctx.from.id).toString());
		idHistory.push('~' + ctx.from.id.toString());
		while (idHistory.length>7) idHistory.splice(0,1);
		saveData();
	}
});

bot.help((ctx) => ctx.reply('Данный бот умеет открывать шлагбаум и сообщать погоду\nЕсли клавиатура не появилась, нажми старт или сообщи администратору\nЧтобы узнать погоду, введи название города'));

bot.on('photo', async (ctx) => {	
	socket.send(`TM: pi: ${ctx.from.id}, ${ctx.from.first_name}: photo`);
	photoUrl.id.push(ctx.from.id);
	photoUrl.url.push(ctx.message.photo[2].file_id);
	ctx.replyWithHTML(
		'Выбери язык:\n',
		Markup.inlineKeyboard([
			Markup.callbackButton('Русский', 'rusOCR'),
			Markup.callbackButton('Английский', 'engOCR')
		], {columns: 2}).extra());
	
	if ((logSet)&&(!admin.includes(ctx.from.id))) {
		let time = new Date();
		fs.appendFile("logFile.txt", `${time.getDay()}-${time.getMonth()+1}-${time.getYear()} ${time.getHours()}:${time.getMinutes()} - ${ctx.from.id} - ${ctx.from.first_name} ${ctx.from.last_name}: распознавание\n`, function(error){
			if(error) throw error;
		});
	}
	
	if ((logSet)&&(!admin.includes(ctx.from.id))) {
		let time = new Date();
		fs.appendFile("logFilePhoto.txt", `${time.getDay()}-${time.getMonth()+1}-${time.getYear()} ${time.getHours()}:${time.getMinutes()} - ${ctx.from.id} - ${ctx.from.first_name} ${ctx.from.last_name}: ${ctx.message.photo[2].file_id}\n`, function(error){
			if(error) throw error;
		});
	}
});

bot.on('text', async ctx => {
	console.log(ctx.message.text);
	console.log('id: '+ctx.from.id);
	socket.send(`TM: pi: ${ctx.from.id}, ${ctx.from.first_name}: ${ctx.message.text}`);
	let trimB = true;
//	ctx.reply('Сообщение: '+ctx.message.text);
	if ((ctx.message.text[0]=='~')&&(newAdmin.idDeletter.includes(ctx.from.id)))
	{
		trimB = false;
		if (ctx.message.text==='~назад') {
			newAdmin.idDeletter.splice(newAdmin.idDeletter.indexOf(ctx.from.id), 1);
			ctx.replyWithHTML(
				'Задержка задается через !~\nзапись лога: $!~старт\nостановить запись: $!~стоп\nлог: $!~лог\nВот клавиатура для всякого\n',
				keyboard());
		}
		else {
			let buf = ctx.message.text.substr(1);
			if ((Number(buf)>=0)&&((admin.includes(Number(buf)))||(notRoot.includes(Number(buf))))) {
				newAdmin.idDelete[newAdmin.idDeletter.indexOf(ctx.from.id)]=Number(buf);
				ctx.replyWithHTML('id: ' + buf +
				'Удаляем?', Markup.inlineKeyboard([
					Markup.callbackButton('Да', 'yesDel'),
					Markup.callbackButton('Нет', 'noDel')
				], {columns: 2}).extra());
			}
			else {
				newAdmin.idDeletter.splice(newAdmin.idDeletter.indexOf(ctx.from.id),1);
				ctx.replyWithHTML(
					'Не удалось удалить ID. проверь ввод и повтори\n',
					keyboard())
				}
		}
	saveData();
	}
	
	if ((admin.includes(ctx.from.id))&&(ctx.message.text==='$!~старт'))
	{
		trimB = false;
		logSet = true;
		ctx.reply('Запись начата');
	}
	
	if ((admin.includes(ctx.from.id))&&(ctx.message.text==='$!~стоп'))
	{
		trimB = false;
		logSet = false;
		ctx.reply('Запись завершена');
	}
	
	if ((admin.includes(ctx.from.id))&&(ctx.message.text==='$!~лог'))
	{
		trimB = false;
		let buf = fs.readFileSync("logFile.txt", "utf8");
		buf.length >1 ? ctx.reply(buf.slice(-1800)) : ctx.reply('нет записей');
	}
	
	if ((admin.includes(ctx.from.id))&&(ctx.message.text==='$!~фотоЛог'))
	{
		trimB = false;
		let buf = fs.readFileSync("logFilePhoto.txt", "utf8");
		buf.length >1 ? ctx.reply(buf.slice(-1800)) : ctx.reply('нет записей');
	}
	
	if ((ctx.message.text[0]=='!')&&(ctx.message.text[1]=='~')&&(admin.includes(ctx.from.id)))
	{
		trimB = false;
		let buf = ctx.message.text.substr(2);
		if (Number(buf)>=0) {
			ctx.reply(`Задано значение задержки: ${buf}`);
                        timeDelay = Number(buf);
			saveData();
		}
		else {
			ctx.reply('Проверь ввод');
		}
	}
	
	if ((ctx.message.text[0]=='~')&&(newAdmin.idSetter.includes(ctx.from.id)))
	{
		trimB = false;
		let buf = ctx.message.text.substr(1);
		if (Number(buf)>=0) {
			ctx.replyWithHTML('id: ' + buf +
			'Админ или юзер?', Markup.inlineKeyboard([
				Markup.callbackButton('Админ', 'admin'),
				Markup.callbackButton('Нет', 'user')
			], {columns: 2}).extra());
			newAdmin.idSave[newAdmin.idSetter.indexOf(ctx.from.id)] = Number(buf);
		}
		else {
			newAdmin.idSetter.splice(newAdmin.idSetter.indexOf(ctx.from.id),1);
			ctx.replyWithHTML(
				'Не удалось задать ID. проверь ввод и повтори\n',
				keyboard())
			}
		saveData();
	}

	if ((ctx.message.text === '_открыть шлагбаум_')&&((admin.includes(ctx.from.id))||(notRoot.includes(ctx.from.id)))) {
		trimB = false;
		if ((Number(new Date()) - Number(new Date(ctx.message.date*1000)))<20000) {
			if (door) ctx.reply('занято. подожди 10 секунд');
			else {
				ctx.reply('открываю');
				door=1;
				LEDdoor.digitalWrite(door);
				setTimeout(() => {
					door=0;
					LEDdoor.digitalWrite(door);
				}, timeDelay);
			}
		}
		else {
			if (!lostId.includes(ctx.from.id)) lostId.push(ctx.from.id);
			if ((checkLostId)&&(lostId.length>0)) {
				checkLostId = false;
				setTimeout(() => {
					checkLostId = true;
					for (let i=0; i<lostId.length; i++)
						ctx.telegram.sendMessage(lostId[i], 'Интернет-соединение восстановлено. Приношу извинения за неудобства');
					lostId = [];
				}, 10000);
			}
		}
    } 

	if ((ctx.message.text === 'реле вкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('реле включено');
		rel=1;
		LEDonrel.digitalWrite(rel);
    } 
	
	if ((ctx.message.text === 'реле выкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('реле выключено');
		rel=0;
		LEDonrel.digitalWrite(rel);
    } 
	
	if ((ctx.message.text === 'красный вкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('красный включен');
		red=1;
		LEDred.digitalWrite(red);
    } 
	
	if ((ctx.message.text === 'красный выкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('красный выключен');
		red=0;
		LEDred.digitalWrite(red);
    } 
	
	if ((ctx.message.text === 'синий вкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('синий включен');
		blue=1;
		LEDblue.digitalWrite(blue);
    } 
	
	if ((ctx.message.text === 'синий выкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('синий выключен');
		blue=0;
		LEDblue.digitalWrite(blue);
    } 
	
	if ((ctx.message.text === 'все выкл')&&(admin.includes(ctx.from.id))) {
		trimB = false;
		ctx.reply('все выключены');
		red=0;
		blue=0;
		rel=0;
		LEDred.digitalWrite(red);
		LEDblue.digitalWrite(blue);
		LEDonrel.digitalWrite(rel);
    } 
	
	if ((ctx.message.text === 'статус')&&(admin.includes(ctx.from.id))) {	
		trimB = false;
		myip = ni.wlan0[0].address;	
		await ctx.reply('синий: ' + (blue==1 ? 'вкл' : 'выкл'));
		await ctx.reply('красный: ' + (red==1 ? 'вкл' : 'выкл'));
		await ctx.reply('реле: ' + (rel==1 ? 'вкл' : 'выкл'));
		await ctx.reply('локальный ip: ' + myip);
		await ctx.reply('логгирование: ' + ( logSet ? 'вкл' : 'выкл'));
		await ctx.reply('задержка: ' + timeDelay);
    } 
	
	if ((ctx.message.text === 'добавить пользователя')&&(admin.includes(ctx.from.id))) {
		trimB = false;	
		ctx.replyWithHTML('Выбери id из предложенных или введи', Markup.keyboard(idHistory).resize().extra());
		newAdmin.idSetter.push(ctx.from.id);
    } 
	
	if ((ctx.message.text === 'удалить пользователя')&&(admin.includes(ctx.from.id))) {	
		trimB = false;
		let mas = [];
		for (i=0;i<admin.length; i++) mas.push('~' + admin[i].toString());
		for (i=0;i<notRoot.length; i++) if (notRoot[i]!=null) mas.push('~' + notRoot[i].toString());
		mas.push('~назад');
		ctx.replyWithHTML('Выбери id из предложенных', Markup.keyboard(mas).resize().extra());
		newAdmin.idDeletter.push(ctx.from.id);
		saveData();
    } 
	
	if ((logSet)&&(!admin.includes(ctx.from.id))) {
		let time = new Date();
		fs.appendFile("logFile.txt", `${time.getDate()}-${time.getMonth()+1}-${time.getYear()} ${time.getHours()}:${time.getMinutes()} - ${ctx.from.id} - ${ctx.from.first_name} ${ctx.from.last_name}: ${ctx.message.text}\n`, function(error){
			if(error) throw error;
		});
	}
	
	if ((admin.includes(ctx.from.id))&&((ctx.message.text.substr(0,5)==='all: ')||(ctx.message.text.substr(0,5)==='All: ')))
	{
		trimB = false;
		for (let i=0; i<notRoot.length; i++)
			bot.telegram.sendMessage(notRoot[i], ctx.message.text.substr(5));
		for (let i=0; i<admin.length; i++)
			bot.telegram.sendMessage(admin[i], ctx.message.text.substr(5));
	}
	
	if ((trimB)&&((admin.includes(ctx.from.id))||(notRoot.includes(ctx.from.id)))) {
		city = city = ctx.message.text.trim().toLowerCase();
		if (!regexp.test(city)) city = encodeURI(city);
		let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&lang=ru&units=metric&appid=${apiKey}`;
		axios.get(url).then(res => { 
			ctx.reply('Город: ' + res.data.name + '\nтемпература : ' + res.data.main.temp + '\nПогода: ' + res.data.weather[0].description + '\nРассвет: ' + timeConverter(res.data.sys.sunrise) + '\nЗакат: ' + timeConverter(res.data.sys.sunset));
		}).catch((e) => {
			console.log(e);
			ctx.reply('Такой город не найден');
		});
	}
});

bot.action(['yesReg', 'noReg', 'yesDel', 'noDel', 'admin', 'user'], ctx => {
    ctx.answerCbQuery();
    ctx.deleteMessage();
	if (ctx.callbackQuery.data === 'admin') {	
		admin.push(newAdmin.idSave[newAdmin.idSetter.indexOf(ctx.from.id)]);
		newAdmin.idSave.splice(newAdmin.idSetter.indexOf(ctx.from.id),1);
		newAdmin.idSetter.splice(newAdmin.idSetter.indexOf(ctx.from.id),1);
		saveData();		
		ctx.replyWithHTML(
			'Готово',
			keyboard());
		
	}
	
	if (ctx.callbackQuery.data === 'user') {
        ctx.deleteMessage();
		notRoot.push(newAdmin.idSave[newAdmin.idSetter.indexOf(ctx.from.id)]);
		newAdmin.idSave.splice(newAdmin.idSetter.indexOf(ctx.from.id),1);
		newAdmin.idSetter.splice(newAdmin.idSetter.indexOf(ctx.from.id),1);
		saveData();		
		ctx.replyWithHTML(
			'Готово',
			keyboard())
		
    }
	if (ctx.callbackQuery.data === 'yesDel') {	
		if (admin.includes(newAdmin.idDelete[newAdmin.idDeletter.indexOf(ctx.from.id)])) admin.splice(admin.indexOf(newAdmin.idDelete),1);
		if (notRoot.includes(newAdmin.idDelete[newAdmin.idDeletter.indexOf(ctx.from.id)])) notRoot.splice(admin.indexOf(newAdmin.idDelete),1);
		newAdmin.idDelete.splice(newAdmin.idDeletter.indexOf(ctx.from.id),1);
		newAdmin.idDeletter.splice(newAdmin.idDeletter.indexOf(ctx.from.id),1);
		saveData();	
		ctx.replyWithHTML(
			'Готово',
			keyboard())
		
	}
	
	if (ctx.callbackQuery.data === 'noDel') {
        ctx.deleteMessage();
		newAdmin.idDelete.splice(newAdmin.idDeletter.indexOf(ctx.from.id),1);
		newAdmin.idDeletter.splice(newAdmin.idDeletter.indexOf(ctx.from.id),1);
		saveData();		
		ctx.replyWithHTML(
			'Ну нет так нет',
			keyboard())
		
    }
}).catch ((err) => {
	console.log(err);
}); 

bot.on('callback_query', async (ctx) => {
    ctx.answerCbQuery();
    ctx.deleteMessage();
	let sended = {};
	if (ctx.callbackQuery.data==='rusOCR') 
	{
		sended = {
			token: axiosToken,
			telegToken: process.env.TG_TOKEN,
			id: photoUrl.url[photoUrl.id.indexOf(ctx.from.id)],
			lang: 'rus'
		}
		ctx.reply('Обработка');
		axios.post(axiosUrl, sended).then(res => {
			if (res.data.status == 200) ctx.reply(res.data.text);
			if (res.data.status == 500) ctx.reply('Ошибка при распознавании текста');
			if (res.data.status == 403) ctx.reply('Ошибка при авторизации');
		}).catch((e) => {console.log(e)});
		photoUrl.url.splice(photoUrl.id.indexOf(ctx.from.id),1);
		photoUrl.id.splice(photoUrl.id.indexOf(ctx.from.id),1);
	}
	if (ctx.callbackQuery.data==='engOCR') 
	{
		sended = {
			token: axiosToken,
			telegToken: process.env.TG_TOKEN,
			id: photoUrl.url[photoUrl.id.indexOf(ctx.from.id)],
			lang: 'eng'
		}
		ctx.reply('Обработка');
		axios.post(axiosUrl, sended).then(res => {
			if (res.data.status == 200) ctx.reply(res.data.text);
			if (res.data.status == 500) ctx.reply('Ошибка при распознавании текста');
			if (res.data.status == 403) ctx.reply('Ошибка при авторизации');
		}).catch((e) => {console.log(e)});
		photoUrl.url.splice(photoUrl.id.indexOf(ctx.from.id),1);
		photoUrl.id.splice(photoUrl.id.indexOf(ctx.from.id),1);
	}
});

function keyboard() {
    return Markup.keyboard([
        ['реле вкл', 'реле выкл'],
        ['красный вкл', 'красный выкл'],
		['синий вкл', 'синий выкл'],
		['статус', 'все выкл'],
		['_открыть шлагбаум_'],
		['добавить пользователя', 'удалить пользователя'],
		['$!~лог', '$!~фотоЛог']
    ]).resize().extra()
}

function saveData() {
	let dataSave = {
		admins: admin,
		historyId: idHistory,
		notRoot: notRoot,
		newAdmin: newAdmin,
		timeDelay: timeDelay,
		logSet: logSet
		}
	fs.writeFile("admins.txt", JSON.stringify(dataSave), function(error) {
		if(error) throw error;
		console.log('write done');
		let data = fs.readFileSync("admins.txt", "utf8");
		console.log(data);
	});
}

function timeConverter(UNIX_timestamp){
  let a = new Date(UNIX_timestamp * 1000);
  let hour = a.getHours();
  let min = a.getMinutes();
  let sec = a.getSeconds();
  let time = hour + ':' + min + ':' + sec ;
  return time;
}

async function checkMessage() {
	await imaps.connect(configIMAP).then(function (connection) {
		connection.openBox('INBOX').then(function () {
			let searchCriteria = ['UNSEEN'];
			let fetchOptions = {
				bodies: ['HEADER', 'TEXT', ''],
				markSeen: true
			};
			connection.search(searchCriteria, fetchOptions).then(function (messages) {
				messages.forEach(function (item) {
					let all = _.find(item.parts, { "which": "" })
					let id = item.attributes.uid;
					let idHeader = "Imap-Id: "+id+"\r\n";
					simpleParser(idHeader+all.body, (err, mail) => {
						// access to the whole mail object
						console.log(mail.subject);
						console.log(mail.from.value[0].address);
						console.log(mail.text);
						if (emailBuf.length==0)
							emailBuf.push(mail);
						else 
							if (mail.text!=emailBuf[emailBuf.length-2].text)
								emailBuf.push(mail);
						//console.log(mail.html)
					});
				});
			});
		});
	});
}

bot.launch();
console.log('bot start');

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
	setTimeout(() => {
		console.log('reconnect');
		client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');
	}, 10*1000)
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
		setTimeout(() => {
			console.log('reconnect');
			client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');
		}, 10*1000)
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
			if (message.utf8Data === 'reboot') {
				console.log('\x1b[31mREBOOT\x1b[0m');
				needReb = true;
				bot.telegram.sendMessage(admin[0], 'REBOOT');
			}
			if (message.utf8Data === 'restart') {
				console.log('restart');
				connection.sendUTF('TM: pi: restart');
				needRest = true;
				bot.telegram.sendMessage(admin[0], 'Restart');
			}
			if (message.utf8Data === 'gitPull') {
				console.log('git pull');
				connection.sendUTF('TM: pi: pull');
				bot.telegram.sendMessage(admin[0], 'pull');
				needPull = true;
			}
			if (message.utf8Data === 'gitPush') {
				console.log('git push');
				connection.sendUTF('TM: pi: push');
				bot.telegram.sendMessage(admin[0], 'push');
				needPush = true;
			}
            else console.log("Received: '" + message.utf8Data + "'");
        }
    });
	
	socket = connection;
    
    function sendNumber() {
        if (connection.connected) {
            var number = new Date();
            connection.sendUTF('pi: ' + (Number(number)).toString());
			if (gitRes.length>2) { connection.sendUTF(`TM: pi: ${gitRes}`); gitRes = '';}
            setTimeout(sendNumber, 60*1000);
        }
    }
    sendNumber();
});

client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');