const Generator = require('yeoman-generator');
const chalk = require('chalk');

const createCommonsChunkPlugin = require('webpack-addons').createCommonsChunkPlugin;

const Input = require('webpack-addons').Input;
const Confirm = require('webpack-addons').Confirm;
const RawList = require('webpack-addons').RawList;

const entryQuestions = require('./utils/entry');
const getBabelPlugin = require('./utils/module');
const getDefaultPlugins = require('./utils/plugins');
const tooltip = require('./utils/tooltip');

module.exports = class WebpackGenerator extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.isProd = false;
		this.npmInstalls = ['webpack', 'uglifyjs-webpack-plugin'];
		this.configuration = {
			config: {
				webpackOptions: {},
				topScope: []
			}
		};
	}
	prompting() {

		let done = this.async();
		let self = this;
		let oneOrMoreEntries;
		let regExpForStyles;
		let ExtractUseProps;
		process.stdout.write(
			'\n' + chalk.bold('Insecure about some of the questions?') + '\n'
		);
		process.stdout.write(
			`\n${chalk.bold.green('https://github.com/webpack/webpack-cli/blob/master/INIT.md')}\n\n`
		);
		this.configuration.config.webpackOptions.module = {
			rules: []
		};
		this.configuration.config.webpackOptions.plugins = getDefaultPlugins();
		this.configuration.config.topScope.push(
			'const webpack = require(\'webpack\')',
			tooltip.uglify(),
			'const UglifyJSPlugin = require(\'uglifyjs-webpack-plugin\');',
			'\n'
		);
		this.prompt([
			Confirm('entryType', 'Will you be creating multiple bundles?')
		]).then( (entryTypeAnswer) => {
			// Ask different questions for entry points
			entryQuestions(self, entryTypeAnswer).then(entryOptions => {
				this.configuration.config.webpackOptions.entry = entryOptions;
				oneOrMoreEntries = Object.keys(entryOptions);
			}).then( () => {

				this.prompt([
					Input(
						'outputType',
						'Which folder will your generated bundles be in? [default: dist]:'
					)
				]).then( (outputTypeAnswer) => {
					if(!this.configuration.config.webpackOptions.entry.length) {
						this.configuration.config.topScope.push(tooltip.commonsChunk());
						this.configuration.config.webpackOptions.output = {
							filename: '\'[name].[chunkhash].js\'',
							chunkFilename: '\'[name].[chunkhash].js\''
						};
					} else {
						this.configuration.config.webpackOptions.output = {
							filename: '\'[name].bundle.js\'',
						};
					}
					if(outputTypeAnswer['outputType'].length) {
						this.configuration.config.webpackOptions.output.path = `'${outputTypeAnswer['outputType']}'`;
					} else {
						this.configuration.config.webpackOptions.output.path = '\'./dist\'';
					}
				}).then( () => {
					this.prompt([
						Confirm('prodConfirm', 'Are you going to use this in production?')
					]).then( (prodAnswer) => {
						if(prodAnswer['prodConfirm'] === true) {
							this.isProd = true;
						} else {
							this.isProd = false;
						}
					}).then( () => {
						this.prompt([
							Confirm('babelConfirm', 'Will you be using ES2015?')
						]).then( (ans) => {
							if(ans['babelConfirm'] === true) {
								this.configuration.config.webpackOptions.module.rules.push(getBabelPlugin());
								this.npmInstalls = ['babel-loader', 'babel-core', 'babel-preset-env'];
							}
						}).then( () => {
							this.prompt([
								RawList(
									'stylingType',
									'Will you use one of the below CSS solutions?',
									['SASS', 'LESS', 'CSS', 'PostCSS', 'No']
								)
							]).then( (stylingAnswer) => {
								if(!this.isProd) {
									ExtractUseProps = [];
								}
								if(stylingAnswer['stylingType'] === 'SASS') {
									this.npmInstalls.push(
										'sass-loader', 'node-sass',
										'style-loader', 'css-loader'
									);
									regExpForStyles = new RegExp(/\.(scss|css)$/);
									if(this.isProd) {
										ExtractUseProps = `use: [{
											loader: 'css-loader',
											options: {
												sourceMap: true
											}
										}, {
											loader: 'sass-loader',
											options: {
												sourceMap: true
											}
										}],
										fallback: 'style-loader'`;
									} else {
										ExtractUseProps.push({
											loader: '\'style-loader\''
										}, {
											loader: '\'css-loader\''
										}, {
											loader: '\'sass-loader\''
										});
									}
								}
								else if(stylingAnswer['stylingType'] === 'LESS') {
									regExpForStyles = new RegExp(/\.(less|css)$/);
									this.npmInstalls.push(
										'less-loader', 'less',
										'style-loader', 'css-loader'
									);
									if(this.isProd) {
										ExtractUseProps = `
										use: [{
											loader: 'css-loader',
											options: {
												sourceMap: true
											}
										}, {
											loader: 'less-loader',
											options: {
												sourceMap: true
											}
										}],
										fallback: 'style-loader'`;
									} else {
										ExtractUseProps.push({
											loader: '\'css-loader\'',
											options: {
												sourceMap: true
											}
										}, {
											loader: '\'less-loader\'',
											options: {
												sourceMap: true
											}
										});
									}
								}
								else if(stylingAnswer['stylingType'] === 'PostCSS') {
									this.configuration.config.topScope.push(
										tooltip.postcss(),
										'const autoprefixer = require(\'autoprefixer\');',
										'const precss = require(\'precss\');',
										'\n'
									);
									this.npmInstalls.push(
										'style-loader', 'css-loader',
										'postcss-loader', 'precss',
										'autoprefixer'
									);
									regExpForStyles = new RegExp(/\.css$/);
									if(this.isProd) {
										ExtractUseProps = `
										use: [{
											loader: 'style-loader'
										},{
											loader: 'css-loader',
											options: {
												sourceMap: true,
												importLoaders: 1
											}
										}, {
											loader: 'postcss-loader',
											options: {
												plugins: function () {
													return [
														precss,
														autoprefixer
													];
												}
											}
										}],
										fallback: 'style-loader'`;
									} else {
										ExtractUseProps.push({
											loader: '\'style-loader\''
										},{
											loader: '\'css-loader\'',
											options: {
												sourceMap: true,
												importLoaders: 1
											}
										}, {
											loader: '\'postcss-loader\'',
											options: {
												plugins: `function () {
													return [
														precss,
														autoprefixer
													];
												}`
											}
										});
									}
								}
								else if(stylingAnswer['stylingType'] === 'CSS') {
									this.npmInstalls.push('style-loader', 'css-loader');
									regExpForStyles = new RegExp(/\.css$/);
									if(this.isProd) {
										ExtractUseProps = `use: [{
											loader: 'css-loader',
											options: {
												sourceMap: true
											}
										}],
										fallback: 'style-loader'`;
									} else {
										ExtractUseProps.push({
											loader: '\'css-loader\'',
											options: {
												sourceMap: true
											}
										});
									}
								}
								else {
									regExpForStyles = null;
								}
							}).then( () => {
								// Ask if the user wants to use extractPlugin
								this.prompt([
									Input(
										'extractPlugin',
										'If you want to bundle your CSS files, what will you name the bundle? (press enter to skip)'
									)
								]).then( (extractAnswer) => {
									if(regExpForStyles) {
										if(this.isProd) {

											this.configuration.config.topScope.push(tooltip.cssPlugin());
											this.npmInstalls.push('extract-text-webpack-plugin');
											if(extractAnswer['extractPlugin'].length !== 0) {
												this.configuration.config.webpackOptions.plugins.push(
													'new ExtractTextPlugin(\'' +
													extractAnswer['extractPlugin'] +
													'.[contentHash].css\')'
												);
											} else {
												this.configuration.config.webpackOptions.plugins.push(
													'new ExtractTextPlugin(\'' +
													'style.css\')'
												);
											}
											const moduleRulesObj = {
												test: regExpForStyles,
												use: `ExtractTextPlugin.extract({
													${ExtractUseProps}
												})`
											};
											this.configuration.config.webpackOptions.module.rules.push(
												moduleRulesObj
											);
											this.configuration.config.topScope.push(
												'const ExtractTextPlugin = require(\'extract-text-webpack-plugin\');',
												'\n'
											);
										} else {
											const moduleRulesObj = {
												test: regExpForStyles,
												use: ExtractUseProps
											};
											this.configuration.config.webpackOptions.module.rules.push(
												moduleRulesObj
											);
										}
									}
								}).then( () => {
									if(!this.configuration.config.webpackOptions.entry.length) {
										oneOrMoreEntries.forEach( (prop) => {
											this.configuration.config.webpackOptions.plugins.push(
												createCommonsChunkPlugin(prop)
											);
										});
									}
									done();
								});
							});
						});
					});
				});
			});
		});
	}
	installPlugins() {
		let asyncNamePrompt = this.async();
		let defaultName = this.isProd ? 'prod' : 'config';
		this.prompt([
			Input('nameType', `Name your \'webpack.[name].js?\' [default: \'${defaultName}\']:`)
		]).then( (nameAnswer) => {
			if(nameAnswer['nameType'].length) {
				this.configuration.config.configName = nameAnswer['nameType'];
			} else {
				this.configuration.config.configName = defaultName;
			}
		}).then( () => {
			asyncNamePrompt();
			this.npmInstall(this.npmInstalls, { 'save-dev': true });
		});
	}

};
