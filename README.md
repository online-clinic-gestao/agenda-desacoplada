# Agenda Desacoplada

Este projeto visa a integração por terceiros á agenda eletrônica da onlineclinic. Se você já possui uma conta na nossa plataforma, você pode utiliza-la em seu site. Atualmente, por instância só é posível realizar agendamentos para um médico em uma clínica. Caso possua mais médicos, vai ser necessário inicializar a aplicação várias vezes.

# Ambientes

Nós possuímos dois ambientes para utilização. O primeiro é `SANDBOX` e o segundo `PRODUCTION`. Enquanto desejar realizar testes, você pode solicitar uma conta no nosso ambiente de homologação, o que te permite validar a solução antes de integra-la ao seu fluxo principal

# Utilização

## React

Se você utiliza uma aplicação React, você pode instalar nosso componente utilizando

```shell
yarn add agenda-desacoplada
```

Em seguida, importe o componente

```js
import Agenda from "agenda-desacoplada";
```

Por fim, basta renderizar e passar as propriedades

```ts
<Agenda
  logo_url=""
  authorization_endpoint="http://localhost:8080/api/v1/auth/one-time-token/"
  environment="SANDBOX"
/>
```

- **logo_url** - Você pode customizar a agenda com a sua própria marca passando uma URL de uma imagem
- **authorization_endpoint** - Endpoint do qual a aplicação vai capturar o token. Você precisa implementa-lo de maneira segura. Na próxima seção explicamos como você pode fazer isso.
- **environment** - `SANDBOX | PRODUCTION` Use os valores para alterar entre o ambiente de homologação e produção.

## VanillaJS

# Servidor de Autorização

Para utilizar nossa agenda, você precisa implmeentar no lado do servidor, a solicitação de autorização para poder gravar na agenda. Segue alguns exemplos de como pode ser feito:

### cUrl

```sh
curl --location --request GET 'https://app.onlineclinic.com.br/api/v1/auth/one-time-token/' \
--header 'X-API-KEY: your-api-key' \
--header 'Content-Type: application/json' \
--data '{
    "doctor_id": 1,
    "clinic_id": 1,
}'
```

### Python

```python
import requests
import json

url = "https://app.onlineclinic.com.br/api/v1/auth/one-time-token/"

payload = json.dumps({
  "doctor_id": 1
  "clinic_id": 1,
})
headers = {
  'X-API-KEY': 'your-api-key',
  'Content-Type': 'application/json',
}

response = requests.request("GET", url, headers=headers, data=payload)

print(response.text)
```

### Node

```ts
const axios = require("axios");
let data = JSON.stringify({
  doctor_id: 1,
  clinic_id: 1,
});

let config = {
  method: "get",
  maxBodyLength: Infinity,
  url: "https://app.onlineclinic.com.br/api/v1/auth/one-time-token/",
  headers: {
    "X-API-KEY": "your-api-key",
    "Content-Type": "application/json",
  },
  data: data,
};

axios
  .request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
  })
  .catch((error) => {
    console.log(error);
  });
```

O payload de resposta deve ser devolvido, e o resto da aplicação vai lidar com ele diretamente.

Observe que temos diferentes urls para nossos ambientes:

- Produção: https://app.onlineclinic.com.br
- Homologação: https://hml.onlineclinic.com.br
