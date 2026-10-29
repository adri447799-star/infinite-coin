# MOEDACRAFT — Duelo da Moeda 🪙

Jogo multiplayer de cara ou coroa para dois jogadores, com salas por código, placar, histórico e animação da moeda.

## Rodar no seu computador

1. Instale o **Node.js 18 ou superior**: https://nodejs.org/
2. Extraia a pasta `moedacraft`.
3. Abra um terminal dentro dessa pasta.
4. Rode:

   ```bash
   npm install
   npm start
   ```

5. Abra http://localhost:3000 no navegador.
6. Um jogador cria a sala e manda o código ao outro.

## Jogar pela internet (cada um no seu PC)

O servidor precisa ficar hospedado na internet; rodar apenas em `localhost` não conecta computadores distantes.

### Opção recomendada: Render

1. Crie uma conta no GitHub e um repositório novo chamado `moedacraft`.
2. Envie os arquivos desta pasta para esse repositório (não envie `node_modules`, se existir).
3. Entre em https://render.com e crie um **Web Service** conectado ao repositório.
4. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Faça o deploy e aguarde o Render fornecer um endereço HTTPS, parecido com `https://moedacraft-xxxx.onrender.com`.
6. Você e Caio abrem o mesmo endereço. Um clica em **Criar sala** e manda o código; o outro digita o código e clica em **Entrar**.

Observações:
- Planos gratuitos de hospedagem podem dormir após inatividade; a primeira abertura pode demorar.
- O código da sala não é uma conta nem uma senha: compartilhe apenas com quem vai jogar.
- A sala guarda o estado na memória do servidor; reiniciar/reimplantar o serviço apaga as partidas.
- O resultado da moeda é decidido pelo servidor, usando sorteio aleatório criptográfico.

## Regras

- Cada jogador escolhe **cara** ou **coroa** em segredo (a escolha do outro não é revelada antes do lançamento).
- Quando os dois escolherem, o servidor lança a moeda.
- Cada jogador que acertar ganha 1 ponto; quem errar não pontua. Se ambos acertarem, ambos pontuam.
- Clique em **Próxima rodada** para continuar. **Reiniciar partida** zera placar e histórico.
