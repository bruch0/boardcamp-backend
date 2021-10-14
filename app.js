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

const connection = Pool(connectionData)

const app = express();
app.use(cors());
app.use(express.json());

