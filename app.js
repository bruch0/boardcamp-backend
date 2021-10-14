import express from 'express';
import cors from 'cors'
import pg from 'pg'
import { stripHtml } from "string-strip-html";
import Joi from 'joi';

const { Pool } = pg

const connectionData = {
	user: 'postgres',
	password: '123456',
	host: 'localhost',
	port: 5432,
	database: 'boardcamp'
}

const connection = new Pool(connectionData)

const app = express();
app.use(cors());
app.use(express.json());

app.post('/categories', (req, res) => {
	const newCategorie = req.body;

	const objectRules = Joi.object({
		name: Joi.string()
			.required()
	})

	const marketRules = Joi.object({
		name: Joi.string()
			.min(1)
			.required()
	})

	const objectHasRequiredProperties = objectRules.validate(newCategorie);

	if (!objectHasRequiredProperties.error) {
		const cleanString = stripHtml(newCategorie.name).result.trim();
		const objectFulfillRules = marketRules.validate({name: cleanString});
		if (!objectFulfillRules.error) {
			connection.query('SELECT * FROM categories WHERE name = $1', [cleanString])
				.then((result) => {
					const newCategorieAlreadyExists = result.rows;
					if (!newCategorieAlreadyExists.length) {
						connection.query('INSERT INTO categories (name) VALUES ($1)', [newCategorie.name])
							.then(() => res.sendStatus(201))
					}
					else {
						res.sendStatus(409);
					}
				});
			
		}
		else {
			res.status(400).send('A propriedade name deve ter no mínimo 1 caractere')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name"');
	}
})

app.get('/categories', (req, res) => {
	connection.query('SELECT * FROM categories').then((response) => res.send(response.rows))
})

app.post('/games', (req, res) => {
	const newGame = req.body;

	const objectRules = Joi.object({
		name: Joi.string()
			.required(),

		image: Joi.string()
			.required(),

		stockTotal: Joi.number()
			.required(),

		categoryId: Joi.number()
			.required(),
		
		pricePerDay: Joi.number()
			.required()
	})

	const marketRules = Joi.object({
		name: Joi.string()
			.min(1)
			.required(),

		image: Joi.string()
			.min(1)
			.required(),

		stockTotal: Joi.number()
			.greater(0)
			.required(),

		categoryId: Joi.number()
			.required(),
		
		pricePerDay: Joi.number()
			.greater(0)
			.required()
	})

	const objectHasRequiredProperties = objectRules.validate(newGame);

	if (!objectHasRequiredProperties.error) {
		const cleanObject = {
			name: stripHtml(newGame.name).result.trim(),
			image: stripHtml(newGame.image).result.trim(),
			stockTotal: newGame.stockTotal,
			categoryId: newGame.categoryId,
			pricePerDay: newGame.pricePerDay
		}
		const objectFulfillRules = marketRules.validate(cleanObject);
		if (!objectFulfillRules.error) {
			connection.query('SELECT * FROM categories WHERE id = $1', [cleanObject.categoryId])
				.then((result) => {
					const gameCategoryExists = result.rows;
					if (gameCategoryExists.length) {
						connection.query('SELECT * FROM games WHERE name = $1', [cleanObject.name])
							.then((result) => {
								const gameAlreadyExists = result.rows;
								if (!gameAlreadyExists.length) {
									connection.query('INSERT INTO games ("name", "image", "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)',
									[
										cleanObject.name,
										cleanObject.image,
										cleanObject.stockTotal,
										cleanObject.categoryId,
										cleanObject.pricePerDay
									])
										.then(() => res.sendStatus(201))
								}
								else {
									res.status(400).send('Esse jogo já existe')
								}
							})
					}
					else {
						res.status(400).send('"categoryId" deve ser um id de categoria existente');
					}
				});
			
		}
		else {
			res.status(400).send('"name" não pode estar vazio, "stockTotal" e "pricePerDay" devem ser maiores que 0 e "categoryId" deve ser um id de categoria existente')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name", "stockTotal", "pricePerDay" e "categoryId"');
	}
})

app.get('/games', (req, res) => {
	connection.query('SELECT * FROM games').then((response) => res.send(response.rows))
})

app.listen(4000);