import express from 'express';
import cors from 'cors'
import pg from 'pg'
import { stripHtml } from "string-strip-html";
import Joi from 'joi';
import dayjs from 'dayjs'

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
	const offset = Number(req.query.offset) ? `OFFSET ${Number(req.query.offset)}` : '';
	const limit = Number(req.query.limit) ? `LIMIT ${Number(req.query.limit)}` : '';
	const order = req.query.order ? `ORDER BY ${req.query.order}` : '';
	const descOrder = req.query.desc ? `DESC` : ''
	const query = `SELECT * FROM categories ${order} ${descOrder} ${offset} ${limit};`

	try {
		const response = await connection.query(query);
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
	const name = req.query.name ? `WHERE games.name ILIKE '${req.query.name}%'` : '';
	const offset = Number(req.query.offset) ? `OFFSET ${Number(req.query.offset)}` : '';
	const limit = Number(req.query.limit) ? `LIMIT ${Number(req.query.limit)}` : '';
	const order = req.query.order ? `ORDER BY ${req.query.order}` : '';
	const descOrder = req.query.desc ? `DESC` : ''
	const query = `SELECT games.*, categories.name AS "categoryName" FROM games  JOIN categories ON games."categoryId" = categories.id ${name} ${order} ${descOrder} ${limit} ${offset} ;`

	try {
		const response = await connection.query(query)
		res.send(response.rows)
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
	const cpf = req.query.cpf ? `WHERE cpf ILIKE '${req.query.cpf}%'` : '';
	const offset = Number(req.query.offset) ? `OFFSET ${Number(req.query.offset)}` : '';
	const limit = Number(req.query.limit) ? `LIMIT ${Number(req.query.limit)}` : '';
	const order = req.query.order ? `ORDER BY ${req.query.order}` : '';
	const descOrder = req.query.desc ? `DESC` : ''

	const query = `SELECT * FROM customers ${cpf} ${order} ${descOrder} ${offset} ${limit};`
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

app.post('/rentals', async (req, res) => {
	const newRent = req.body;

	const marketRules = Joi.object({
		customerId: Joi.number()
			.required(),

		gameId: Joi.number()
			.required(),

		daysRented: Joi.number()
			.greater(1)
			.required(),
	});

	const objectFulfillRules = marketRules.validate(newRent);

		if (!objectFulfillRules.error) {
			try {
				const result = await connection.query('SELECT * FROM customers WHERE id = $1', [newRent.customerId]);
				const customerExists = result.rows;
				if (customerExists.length) {
					try {
						const result = await connection.query('SELECT * FROM games WHERE id = $1', [newRent.gameId]);
						const gameExists = result.rows;
						if (gameExists.length && gameExists[0].stockTotal > 0) {
							const pricePerDay = gameExists[0].pricePerDay;
							try {
								const time = Date.now();
								const newRentObj = {
									...newRent,
									rentDate: dayjs(time).format('YYYY-MM-DD'),
									originalPrice: newRent.daysRented * pricePerDay
								}
								
								await connection.query('INSERT INTO rentals ("customerId", "gameId", "daysRented", "rentDate", "originalPrice", "returnDate", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7)',
								[
									newRentObj.customerId,
									newRentObj.gameId,
									newRentObj.daysRented,
									newRentObj.rentDate,
									newRentObj.originalPrice,
									null,
									null,
								]);
								res.sendStatus(201);
							}
							catch {
								res.sendStatus(503);
							}
						}	
						else {
							res.sendStatus(400);
						}
					}
					catch {
						res.sendStatus(400);
					}
				}
				else {
					res.sendStatus(400);
				}
			}
			catch {
				res.sendStatus(503);
			}
			
		}
		else {
			res.status(400).send('A propriedade "name" deve ter no mínimo 1 caractere, "phone" deve ter entre 10 e 11 caracteres, "cpf" deve ter 11 caracteres e "birthday" deve ser no formato yyyy-mm-dd')
		}

})

app.post('/rentals/:rentId/return', async (req, res) => {
	const rentId = Number(req.params.rentId);
	try {
		const result = await connection.query('SELECT * FROM rentals WHERE id = $1', [rentId]);
		const date = dayjs(Date.now()).format('YYYY-MM-DD');
		const fee = (result.rows[0].originalPrice / result.rows[0].daysRented) * dayjs(result.rows[0].rentDate).diff(dayjs(), 'day');
		if (result.rows.length && !result.rows[0].returnDate) {
			try {
				await connection.query('UPDATE rentals SET "returnDate" = $2, "delayFee" = $3 WHERE id = $1;', [result.rows[0].id, date, fee])
				res.sendStatus(200);
			}
			catch {
				res.sendStatus(503);
			}
		}
		else {
			if (!result.rows.length) {
				res.sendStatus(404)
			}
			else {
				res.sendStatus(400)
			}
		}
	}
	catch {
		res.sendStatus(503);
	}
})

app.delete('/rentals/:rentId', async (req, res) => {
	const rentId = Number(req.params.rentId);
	try {
		const result = await connection.query('SELECT * FROM rentals WHERE id = $1', [rentId]);
		const rent = result.rows;
		if (rent.length && !rent[0].returnDate) {
			try {
				await connection.query('DELETE FROM rentals WHERE id = $1;', [rentId])
				res.sendStatus(200);
			}
			catch {
				res.sendStatus(503);
			}
		}
		else {
			if (!rent.length) {
				res.sendStatus(404)
			}
			else {
				res.sendStatus(400)
			}
		}
	}
	catch {
		res.sendStatus(503);
	}
})

app.get('/rentals', async (req, res) => {
	const customerId = req.query.customerId ? `WHERE "customerId" = ${req.query.customerId}` : '';
	const gameId = req.query.gameId ? `WHERE "gameId" = ${req.query.gameId}` : '';
	const offset = Number(req.query.offset) ? `OFFSET ${Number(req.query.offset)}` : '';
	const limit = Number(req.query.limit) ? `LIMIT ${Number(req.query.limit)}` : '';
	const order = req.query.order ? `ORDER BY ${req.query.order}` : '';
	const descOrder = req.query.desc ? `DESC` : ''

	try {
		const result = await connection.query(`SELECT rentals.*, customers.name, games.name AS "gameName", games."categoryId", categories.name AS "categoryName" FROM rentals JOIN customers ON rentals."customerId" = customers."id" JOIN games ON rentals."gameId" = games.id JOIN categories ON games."categoryId" = categories.id ${customerId} ${gameId} ${order} ${descOrder} ${offset} ${limit};`);
		result.rows.map((rent, index) => {
			rent.customer = {
				id: rent.customerId,
				name: rent.name
			};
			rent.game = {
				id: rent.gameId,
				name: rent.gameName,
				categoryId: rent.categoryId,
				categoryName: rent.categoryName
			};
			delete rent.name;
			delete rent.categoryId;
			delete rent.categoryName;
			delete rent.gameName;
			if (index === result.rows.length - 1) {
				res.send(result.rows);
			}
		})

	}
	catch {
		res.sendStatus(503);
	}
})

app.listen(4000);