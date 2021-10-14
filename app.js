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


app.listen(4000);