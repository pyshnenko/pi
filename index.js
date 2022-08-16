require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TG_TOKEN);
const axiosUrl = 'https://spamigor.site:4014/api';
const axiosToken = process.env.AXIOS_TOKEN;
const Markup = require("telegraf/markup.js");
const Gpio = require('pigpio').Gpio;
const os = require( 'os' );
const fs = require("fs");
var ni = os.networkInterfaces( );
const axios = require('axios');
const apiKey = process.env.API_KEY;
var city = 'Moscow';
var regexp = /^[a-z\s]+$/i;
var reg = /^[а-яёa-z]*$/i;

var admin = [];
admin[0] = 209103348;
notRoot = [];
var logSet = true;
let idHistory = [];
let newAdmin = {
	idSetter: [],
	idSave: [],
	idDeletter: [],
	idDelete:[]
}
let timeDelay = 500;

var photoUrl = {
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


var LEDblue = new Gpio(2, {mode: Gpio.OUTPUT});
var LEDred = new Gpio(3, {mode: Gpio.OUTPUT});
var LEDonrel = new Gpio (4, {mode: Gpio.OUTPUT});
var LEDdoor = new Gpio (17, {mode: Gpio.OUTPUT});
let red=0, blue=0, rel=0, door=1;
let myip = ni.wlan0[0].address;

setTimeout(() => {
	door=0;
	console.log('Запущено'), 10000
});

LEDblue.digitalWrite(blue);
LEDred.digitalWrite(red);
LEDonrel.digitalWrite(rel);

bot.start((ctx) => {
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
	let trimB = true;
//	ctx.reply('Сообщение: '+ctx.message.text);
	if ((ctx.message.text[0]=='~')&&(newAdmin.idDeletter.includes(ctx.from.id)))
	{
		trimB = false;
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
		else ctx.reply('Нестабильная работа сети интернет. Повторите запрос позднее');
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
		ctx.replyWithHTML('Выбери id из предложенных', Markup.keyboard(mas).resize().extra());
		newAdmin.idDeletter.push(ctx.from.id);
		saveData();
    } 
	
	if ((logSet)&&(!admin.includes(ctx.from.id))) {
		let time = new Date();
		fs.appendFile("logFile.txt", `${time.getDay()}-${time.getMonth()+1}-${time.getYear()} ${time.getHours()}:${time.getMinutes()} - ${ctx.from.id} - ${ctx.from.first_name} ${ctx.from.last_name}: ${ctx.message.text}\n`, function(error){
			if(error) throw error;
		});
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
  var a = new Date(UNIX_timestamp * 1000);
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = hour + ':' + min + ':' + sec ;
  return time;
}

bot.launch();
console.log('bot start');
