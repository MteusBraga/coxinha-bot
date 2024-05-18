import { google } from 'googleapis'
import { config } from 'dotenv'
config()

const youtubeCliente = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

try{
  const response = await youtubeCliente.search.list({
    channelId: 'UCcDv8Wmn_7ki8qhM3DdQcBQ',
    order: 'date',
    part: 'snippet',
    type: 'video',
    maxResults: 1
  }).then(res => res)
  const latestVideo = response.data.items[0]
  console.log(latestVideo)
} catch(e){
  console.log(e)
}

