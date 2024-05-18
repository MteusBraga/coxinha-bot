import { config } from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, NoSubscriberBehavior } from '@discordjs/voice';
import play from 'play-dl'
config();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});



// Define a queue to hold the songs
const queue = new Map();

client.on('messageCreate', async message => {
  try {
    if(message.content.startsWith("!help")){
      message.reply(`
      Comandos: 
      !play <link(youtube)> 
      !skip 
      !queue
      `)
    }
    
    if (message.content.startsWith('!play')) {
      if (!message.member.voice?.channel) return message.reply('Conecte-se a um canal de voz!');

      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
      });

      let args = message.content.split('play ')[1].split(' ')[0];
      console.log(args);
      let stream = await play.stream(args);

      let resource = createAudioResource(stream.stream, {
        inputType: stream.type
      });

      let player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play
        }
      });

      player.play(resource);

      // Check if there's already a queue for this guild
      if (!queue.has(message.guild.id)) {
        // Create a queue for this guild if it doesn't exist
        queue.set(message.guild.id, {
          connection,
          player,
          songs: [] // List to hold queued songs
        });

        // Subscribe to player event to handle song queue
        player.on('stateChange', (_, newState) => {
          if (newState.status === AudioPlayerStatus.Idle) {
            const guildQueue = queue.get(message.guild.id);
            guildQueue.songs.shift(); // Remove the first song (current song) from the queue
            if (guildQueue.songs.length > 0) {
              const nextSong = guildQueue.songs[0];
              playSong(nextSong, message.guild.id); // Play the next song in the queue
            }
          }
        });
      }

      // Add the song to the queue
      const guildQueue = queue.get(message.guild.id);
      guildQueue.songs.push({ args, message }); // Store the song details in the queue
      if (guildQueue.songs.length === 1) {
        playSong(guildQueue.songs[0], message.guild.id); // If this is the first song in the queue, play it immediately
      }
    }

    
    if (message.content.startsWith('!skip')) {
      const guildQueue = queue.get(message.guild.id);
      if (!guildQueue) return message.reply('Não há músicas na fila para pular.');

      guildQueue.player.stop(); // Para a música atual
      guildQueue.songs.shift(); // Remove a música atual da fila

      if (guildQueue.songs.length > 0) {
        const nextSong = guildQueue.songs[0];
        playSong(nextSong, message.guild.id); // Toca a próxima música na fila
      } else {
        // Se não houver mais músicas na fila, limpe a fila e desconecte o bot do canal de voz
        guildQueue.connection.destroy();
        queue.delete(message.guild.id);
      }

      message.channel.send('Música pulada.');
    }


    if (message.content.startsWith('!queue')) {
      const guildQueue = queue.get(message.guild.id);
      if (!guildQueue || guildQueue.songs.length === 0) {
        return message.channel.send('Não há músicas na fila.');
      }

      let queueList = 'Músicas na Fila:\n';
      guildQueue.songs.forEach((song, index) => {
        queueList += `${index + 1}. ${song.args}\n`; // Assuming song.args contains song details
      });

      message.channel.send(queueList);
    }


    if (message.content.startsWith('!stop')) {
      const guildQueue = queue.get(message.guild.id);
      if (!guildQueue) return message.channel.send('Não há músicas reproduzindo.');

      guildQueue.player.stop(); // Para a reprodução atual
      guildQueue.songs = []; // Limpa a fila de reprodução

      // Desconecta o bot do canal de voz e limpa a fila
      guildQueue.connection.destroy();
      queue.delete(message.guild.id);

      message.channel.send('Reprodução interrompida e fila limpa.');
    }
  } catch (e) {
    console.error(e);
  }
});

// Function to play a song
async function playSong(song, guildId) {
  const guildQueue = queue.get(guildId);
  let stream = await play.stream(song.args);
  let resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });
  guildQueue.player.play(resource);
  guildQueue.connection.subscribe(guildQueue.player);
  song.message.channel.send(`Tocando agora: ${song.args}`);
}


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN);
