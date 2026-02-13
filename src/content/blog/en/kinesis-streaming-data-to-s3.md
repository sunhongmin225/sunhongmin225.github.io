---
title: "Streaming Real-Time Data to S3 with Kinesis Data Streams"
description: "A beginner-friendly guide to building a real-time streaming data pipeline using AWS Kinesis Data Streams and Amazon Data Firehose to load data into S3."
pubDate: 2024-03-22
heroImage: ../../../assets/kinesis-streaming-data-to-s3-hero.png
heroImageCaption: "Thumbnail image"
tags: ["AWS", "Data Engineering", "Kinesis", "Streaming", "Serverless"]
---

> **Originally published** on the [blux Tech Blog](https://blog.blux.ai/kinesis-%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%B0%8D-%EB%8D%B0%EC%9D%B4%ED%84%B0%EC%B2%98%EB%A6%AC-%EC%95%84%ED%82%A4%ED%85%8D%EC%B3%90-0522). Republished here on the author's personal blog.

At Blux, we operate servers that collect customer behavioral data in real time and make it available across multiple services. With the upcoming launch of our new 'CRM (Customer Relationship Management) marketing solution', we needed to build a new data pipeline architecture — one capable of processing large volumes of data in real time and making collected data easily accessible from multiple places. In this post, I'll explain why we chose the real-time data streaming service '[Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html)'.

## Why We Adopted Kinesis Data Streams

'Amazon Web Services (AWS)' provides '[Kinesis Data Streams (hereafter KDS)](https://docs.aws.amazon.com/streams/latest/dev/introduction.html)', which, when configured in 'On-Demand' mode (providing services based on customer demand), dynamically scales its data processing capacity based on incoming data volume. It can achieve write speeds of up to 200 MB/s and read speeds of up to 400 MB/s, with even higher throughput available through a 'support ticket'.

In KDS, the entity that writes data is called a 'Producer', and the entity that reads data is called a 'Consumer'. You can register up to 20 *Consumers*, allowing data in KDS to be utilized across multiple sites. These include 'Amazon Data Firehose', 'AWS Lambda', 'Managed Service for Apache Flink', and 'Kinesis Client Library'.

## Things to Note When Creating Kinesis Data Streams

Setting up KDS is straightforward. You just need to name the 'stream (a virtual channel through which data flows)' and decide whether the 'read/write Capacity mode' should be On-Demand or Provisioned (pre-allocating capacity based on predicted usage). Here's a quick comparison:

| Capacity mode | On-Demand | Provisioned |
|---|---|---|
| Max number of Data Streams | 50 (can be increased via support ticket) | Unlimited |
| Max number of 'Shards (uniquely identified groups of data records in a stream)' | Unlimited | 500 per account (can be increased via 'Quota increase' request) |
| Data throughput | Up to 200 MB/s write and 400 MB/s read (can be increased via support ticket) | Up to 1 MB/s or 1,000 records/s write and 2 MB/s or 2,000 records/s read per Shard |
| Data payload size | Up to 1 MB (before base64 encoding) | Same as On-Demand |

The 'Data retention period' defaults to one day but can be changed after the stream is created. Setting it longer than one day incurs additional charges.

## Loading Data into S3 with 'Amazon Data Firehose'

['Amazon S3'](https://aws.amazon.com/s3/) is a storage service built to store and retrieve any amount of data. It's widely used for storing large volumes of data because it's easy to use from anywhere and cost-effective. We set up additional processing to load data from KDS into S3. In KSD, a stream is essentially a queue where data accumulates during the Data retention period. Consumers move a cursor through this queue to read the accumulated data. Unlike a typical queue, data doesn't disappear when a Consumer reads it — only the Consumer's read position changes.

This means the data needs to be moved to S3 in an appropriate format. One way to do this is with '[Amazon Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html) (Data Firehose)'. Data Firehose is a service that collects and transforms real-time streaming data and loads it into AWS data stores and analytics services. Using this service, you can send data from KDS not only to Amazon S3 but also to Amazon Redshift, Amazon OpenSearch Service, and various other storage and analytics services. Here's what the architecture looks like:

![Architecture diagram: Kinesis Data Streams - Data Firehose - S3](../../../assets/kinesis-streaming-data-to-s3-1.png)
*Architecture diagram: Kinesis Data Streams - Data Firehose - S3. (Source: author)*

In the diagram above, 'Lambda' is an event-driven serverless computing platform provided by Amazon as part of its services. Lambda can be used to transform, filter, decompress, convert, and process data.

## Adding Custom Fields to the S3 Storage Path

When creating a Data Firehose, you can configure several parameters, including an option called [Dynamic Partitioning](https://docs.aws.amazon.com/firehose/latest/dev/dynamic-partitioning.html).

This feature lets you use specific fields from the source data as 'Partitioning keys' and include them in the S3 storage path. For example, suppose data comes in the following format and you want to use the `client_id` and `timestamp` fields to define the S3 path:

```json
{
	"client_id": "1234567890",
	"type": {
		"device": "mobile",
		"event": "purchase"
	},
	"timestamp": 1711005364
}
```

To do this, enable the Inline parsing for JSON option and define the Dynamic partitioning keys as follows:

| Key name | JQ expression |
|---|---|
| client_id | .client_id |
| year | .timestamp |
| month | .timestamp |
| day | .timestamp |
| hour | .timestamp |

Using these Dynamic partitioning keys, you can set the S3 bucket prefix like this:

```
events/client_id=!{partitionKeyFromQuery:client_id}/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/hour=!{partitionKeyFromQuery:hour}/
```

With this S3 bucket prefix configuration, real-time streaming data from KDS flows through Data Firehose and lands in the desired S3 path. You can also define a separate S3 path for error cases. However, note that you cannot use the Partitioning keys defined in Dynamic Partitioning for the error output path.

This is because if the input data format is invalid, Dynamic Partitioning itself may fail — making the partitioning keys unavailable. Instead, you can use the actual *runtime (the actual time when the program executes) timestamp of when Data firehose writes data to S3* (rather than the timestamp in the input data) to set the S3 bucket error output prefix:

```
error-events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/!{firehose:error-output-type}
```

This approach not only lets you include custom fields in the S3 storage path, but also ensures that error cases are stored in separate S3 paths based on the Data firehose runtime timestamp, making it easier to investigate issues.

## Plans for Advancing the Streaming Architecture

In this post, we covered everything from setting up Kinesis Data Streams for real-time streaming data processing to loading data into S3 using Amazon Data Firehose. Going forward, our team will continue to enhance this real-time streaming data architecture and leverage it across multiple use cases!
