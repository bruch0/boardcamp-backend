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

app.post('/categories', async (req, res) => {
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
			try {
				const result = await connection.query('SELECT * FROM categories WHERE name = $1', [cleanString]);
				const newCategorieAlreadyExists = result.rows;
				if (!newCategorieAlreadyExists.length) {
					try {
						await connection.query('INSERT INTO categories (name) VALUES ($1)', [newCategorie.name]);
						res.sendStatus(201)
					}
					catch {
						res.sendStatus(503);
					}
				}
				else {
					res.sendStatus(409);
				}
			}
			catch {
				res.sendStatus(503);
			}
		}
		else {
			res.status(400).send('A propriedade name deve ter no mínimo 1 caractere')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name"');
	}
})

app.get('/categories', async (req, res) => {
	try {
		const response = await connection.query('SELECT * FROM categories');
		res.send(response.rows);
	}
	catch {
		res.sendStatus(503);
	}
})

app.post('/games', async (req, res) => {
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
			try {
				const result = await connection.query('SELECT * FROM categories WHERE id = $1', [cleanObject.categoryId]);
				const gameCategoryExists = result.rows;

				if (gameCategoryExists.length) {
					try {
						result = connection.query('SELECT * FROM games WHERE name = $1', [cleanObject.name]);
						const gameAlreadyExists = result.rows;
						if (!gameAlreadyExists.length) {
							try {
								await connection.query('INSERT INTO games ("name", "image", "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)',
								[
									cleanObject.name,
									cleanObject.image,
									cleanObject.stockTotal,
									cleanObject.categoryId,
									cleanObject.pricePerDay
								])
								res.sendStatus(201);
							}
							catch {
								res.sendStatus(503);
							}
							
						}
						else {
							res.status(400).send('Esse jogo já existe')
						}
					}
					catch {
						res.sendStatus(503);
					}
				}
				else {
					res.status(400).send('"categoryId" deve ser um id de categoria existente');
				}

			}
			catch {
				res.sendStatus(503);
			}
			
		}
		else {
			res.status(400).send('"name" não pode estar vazio, "stockTotal" e "pricePerDay" devem ser maiores que 0 e "categoryId" deve ser um id de categoria existente')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name", "stockTotal", "pricePerDay" e "categoryId"');
	}
})

app.get('/games', async (req, res) => {
	const name = req.query.name;
	const query = name ? `SELECT * FROM games WHERE name ILIKE '${name}%';` : 'SELECT * FROM games';

	try {
		const response = await connection.query(query)
		const games = response.rows;
		games.forEach((game, index) => {
			connection.query('SELECT * FROM categories WHERE id = $1', [game.categoryId])
				.then((response) => {
					game.categoryName = (response.rows[0].name);
					if (index === games.length - 1) {
						res.send(games);
					}
				})
		})
	}
	catch {
		res.sendStatus(503);
	}
})

app.post('/customers', async (req, res) => {
	const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
	const cpfRegex = /^([0-9]){3}([0-9]){3}([0-9]){3}([0-9]){2}$/;
	const newCustomer = req.body;

	const objectRules = Joi.object({
		name: Joi.string()
			.required(),

		phone: Joi.string()
			.required(),

		cpf: Joi.string()
			.required(),

		birthday: Joi.string()
			.required()
	})

	const marketRules = Joi.object({
		name: Joi.string()
			.min(1)
			.required(),

		phone: Joi.string()
			.min(10)
			.max(11)
			.required(),

		cpf: Joi.string()
			.pattern(cpfRegex)
			.required(),

		birthday: Joi.string()
			.pattern(dateRegex)
			.required(),
	})

	const objectHasRequiredProperties = objectRules.validate(newCustomer);

	if (!objectHasRequiredProperties.error) {
		const cleanObject = {
			name: stripHtml(newCustomer.name).result.trim(),
			phone: stripHtml(newCustomer.phone).result.trim(),
			cpf: stripHtml(newCustomer.cpf).result.trim(),
			birthday: stripHtml(newCustomer.birthday).result.trim(),
		}

		const objectFulfillRules = marketRules.validate(cleanObject);

		if (!objectFulfillRules.error) {
			try {
				const result = await connection.query('SELECT * FROM customers WHERE cpf = $1', [cleanObject.cpf]);
				const customerAlreadyRegistered = result.rows;
				if (!customerAlreadyRegistered.length) {
					try {
						await connection.query('INSERT INTO customers ("name", "phone", "cpf", "birthday") VALUES ($1, $2, $3, $4)',
						[
							cleanObject.name,
							cleanObject.phone,
							cleanObject.cpf,
							cleanObject.birthday,
						]);
						res.sendStatus(201);
					}
					catch {
						res.sendStatus(503);
					}
				}
				else {
					res.sendStatus(409);
				}
			}
			catch {
				res.sendStatus(503);
			}
			
		}
		else {
			res.status(400).send('A propriedade "name" deve ter no mínimo 1 caractere, "phone" deve ter entre 10 e 11 caracteres, "cpf" deve ter 11 caracteres e "birthday" deve ser no formato yyyy-mm-dd')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name", "phone", "cpf" e "birthday"');
	}
})

app.put('/customers/:customerId', async (req, res) => {
	const customerId = Number(req.params.customerId);
	const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
	const cpfRegex = /^([0-9]){3}([0-9]){3}([0-9]){3}([0-9]){2}$/;
	const newCustomer = req.body;

	const objectRules = Joi.object({
		name: Joi.string()
			.required(),

		phone: Joi.string()
			.required(),

		cpf: Joi.string()
			.required(),

		birthday: Joi.string()
			.required()
	})

	const marketRules = Joi.object({
		name: Joi.string()
			.min(1)
			.required(),

		phone: Joi.string()
			.min(10)
			.max(11)
			.required(),

		cpf: Joi.string()
			.pattern(cpfRegex)
			.required(),

		birthday: Joi.string()
			.pattern(dateRegex)
			.required(),
	})

	const objectHasRequiredProperties = objectRules.validate(newCustomer);

	if (!objectHasRequiredProperties.error) {
		const cleanObject = {
			name: stripHtml(newCustomer.name).result.trim(),
			phone: stripHtml(newCustomer.phone).result.trim(),
			cpf: stripHtml(newCustomer.cpf).result.trim(),
			birthday: stripHtml(newCustomer.birthday).result.trim(),
		}

		const objectFulfillRules = marketRules.validate(cleanObject);

		if (!objectFulfillRules.error) {
			try {
				const result = await connection.query('SELECT * FROM customers WHERE cpf = $1 AND id != $2', [cleanObject.cpf, customerId]);
				const cpfAlreadyRegistered = result.rows;
				if (!cpfAlreadyRegistered.length) {
					try {
						await connection.query('UPDATE customers SET "name" = $2, phone = $3, cpf = $4, birthday = $5 WHERE id = $1;', 
						[
							customerId,
							cleanObject.name,
							cleanObject.phone,
							cleanObject.cpf,
							cleanObject.birthday
						]);
						res.sendStatus(200);
					}
					catch {
						res.sendStatus(503);
					}
				}
				else {
					res.sendStatus(409);
				}
			}
			catch {
				res.sendStatus(503);
			}
		}
		else {
			res.status(400).send('A propriedade "name" deve ter no mínimo 1 caractere, "phone" deve ter entre 10 e 11 caracteres, "cpf" deve ter 11 caracteres e "birthday" deve ser no formato yyyy-mm-dd')
		}
	}
	else {
		res.status(400).send('O objeto deve conter a propriedade "name", "phone", "cpf" e "birthday"');
	}
})

app.get('/customers', async (req, res) => {
	const cpf = req.query.cpf;
	const query = cpf ? `SELECT * FROM customers WHERE cpf ILIKE '${cpf}%';` : 'SELECT * FROM customers';
	try {
		const response = await connection.query(query);
		res.send(response.rows);
	}
	catch {
		res.sendStatus(503);
	}
})

app.get('/customers/:customerId', async (req, res) => {
	const customerId = Number(req.params.customerId);
	try {
		const response = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
		if (!response.rows.length) {
			res.sendStatus(404)
		}
		else {
			res.send(response.rows);
		}	
	}
	catch {
		res.sendStatus(503);
	}
})



app.listen(4000);