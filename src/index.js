const express = require('express');
const { v4: uuidv4 } = require('uuid')

const app = express();

app.use(express.json());

// Simulando DB (Banco de dados "fake")
const customers = [];

// Middleware (validação)
function verifyIfExistsAccountCPF(request, response, next){

    // Recebendo os dados (cpf) do header da aplicação
    const { cpf } = request.headers;
    
    // Verificando se tem algum CPF igual o que a gente passou (buscando - retornando a informação)/
    const customer = customers.find(customer => customer.cpf === cpf);

    // Retorno caso não encontre o CPF Informado
    if(!customer){
        return response.status(400).json({error: "Customer not found (CPF Nao encontrado)"});
    }

    // Passando os dados (customer) para todas as rotas que forem utilizar esse middleware.
    request.customer = customer;

    // Finalizando e dando andamento
    return next();
}

// Valida se é possivel realizar o saque
function getBalance(statement){
    
    // Vai realizar o calculo do que entrou - o que saiu 
    // acc: acumulador - responsável pelo valor que esta sendo adicionado ou removido.
    const balance = statement.reduce((acc, operation) => {

        if(operation.type === 'credit'){
            return acc + operation.amount;
        }
        else{
            return acc - operation.amount;
        }

    }, 0);

    return balance;

}


/**
 * cpf          - string
 * name         - string
 * id           - uuid
 * statement    - array[]
 */
app.post('/account', (request, response) => {
    
    const {cpf,name } = request.body;

    // Verificando se já existe CPF cadastrado igual o que estou recebendo da API(cadastrando)e retornando TRUE || FALSE
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if(customerAlreadyExists){
        return response.status(400).json({error: "Customer already exists! (CPF JÁ CADASTRADO)"});
    }


    // Alimentando o DB
    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    // Avisando que o dado foi criado!
    return response.status(201).send();

});


// Utilizando o middleware na rota
app.get('/statement', verifyIfExistsAccountCPF, (request, response) =>{

    // Recuperando as informação do middleware;
    const { customer } = request;

    return response.json(customer.statement);
});


// Inserindo um deposito
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    
    // Recuperando a descrição e o valor do body 
    const { description, amount} = request.body;

    const { customer } = request;

    // Operação
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    };

    // Inserindo em nosso DB fake no sistema a operação
    customer.statement.push(statementOperation);

    return response.status(201).send();

});

// Realizando o saque
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {

    // Recuperando do body qual valor que esta sendo solicitado para saque
    const { amount } = request.body;

    // Recuperando informações da conta
    const { customer } = request;

    // Realizando a validação da operação
    const balance = getBalance(customer.statement);

    // Se não tiver o dinheiro em caixa.. erro de saldo 
    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds! (Saldo insuficiente)"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();

});

// Busca do extrato bancario por data
app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) =>{

    // Recuperando as informação do middleware;
    const { customer } = request;

    // Recuperando da url
    const { date } = request.query;

    // Recuperando o extrato da data completo (independente da hora)
    const dateFormat = new Date(date + " 00:00");

    // Retornando somente o extrato bancario do dia solicitado
    const statement = customer.statement.filter((statement) => {
       return statement.created_at.toDateString() === new Date(dateFormat).toDateString();
    });

    return response.json(statement);
});


// Atualizar os dados do cliente
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {

    const { name } = request.body;
    const { customer} = request;

    // Atualizando o name
    customer.name = name;

    return response.status(201).send();

});

// Obter os dados da conta
app.get("/account", verifyIfExistsAccountCPF, (request, response) => {

    const { customer } = request;

    return response.json(customer);

});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {

    const { customer } = request;
    

    //splice | 1 param: aonde inicia - 2param até onde vai excluir
    customers.splice(customer, 1); //removendo a posição 1 do array

    return response.status(200).json(customer);

});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});


app.listen(3333);