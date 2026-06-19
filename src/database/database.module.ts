import { Global, Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('MongoDB');
        const uri =
          process.env.MONGODB_URI ||
          'mongodb://nabdh:nabdh_dev@localhost:27017/nabdh?authSource=admin';
        logger.log(`Connecting to MongoDB: ${uri.replace(/\/\/.*@/, '//***@')}`);
        return { uri };
      },
    }),
  ],
  providers: [DatabaseService],
  exports: [MongooseModule, DatabaseService],
})
export class DatabaseModule {}
