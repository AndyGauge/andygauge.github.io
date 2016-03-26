---
layout: post
section-type: post
title: 'Prayer Lexer - Building Recommended Verse'
category: praybook
tags: [ 'prayer' ]
---

OpenBible.info provides a topical mashup, driven by the community.  The topics are added to the site by searching, and scripture is recommended to each topic.  When users find a verse helpful for the topic, they can chose to vote up the verse per topic.  A weekly dump is made of the data, and offered through the api. 

A topic can have many verses, and a verse can have many topics.  There is no limitation.  What makes them related is the votes.  For my Lexer, I created a model that looks like this:

    rails generate scaffold verse slug:string book:string chapter:string verse:string
    rails generate scaffold topic slug:string
    rails generate model    vote  tally:integer verse_id:references topic_id:references verse_end_id:references

The topic has each verse through the vote model, which includes a verse_end_id that allows multiple continuous verses to be referenced.  The verse slug is in the format 'BBCCCVVV' where BB is a number from 01 to 60 for the book, C is chapter, and V is verse number.  I will be creating a before_create action on the verse model so these fields are filled in when the entry is saved.

To take the data from openbible.info and populate the Rails App, I create a rake job using the following:

    rails generate task importer perform

Eventually the namespace importer will include an all task which will perform the input after downloading the file.  For now we place the file inside the rails root directory.  The rake task does the following:

    require 'importer'
    Importer.perform

For my first rake task, the process was really simple.  Luckily I had already created my module for performing the csv update.  

    module Importer
      require 'csv'
  
      def self.perform
        return false unless data_ok?
        progress = ProgressBar.create(title: 'Crunching', total: data.count)
        ...
        true
      end
    
      def self.file_name
        Rails.root.join('topic-votes.txt')
      end
      
      def self.data
        @parsed ||= CSV.read(file_name, col_sep: "\t")
      end
      
      def self.data_ok?
        @data_is_ok ||= data.shift.include? 'Topic'
      end
    end

This part of the file sets up the CSV parsing of the file and the progress bar to display during the import.  data_ok? takes the first row of the csv and removes it from the array.  This is the header row, we want to make sure the file is correctly formatted, and that we don't add the headers to the list.

The actual data updates occur where the ellipse is above.  That code is demonstrated below:

    data.each do |row|
      top = Topic.find_or_create_by(slug: row[0])
      vote = Vote.where(topic: top,
                   verse: Verse.find_or_create_by(slug: row[1])).first_or_initialize(verse_end: Verse.find_or_create_by(slug: row[2]))
      vote.tally = row[3]
      vote.save
      progress.increment
    end

In this code, each line of the file is used to populate the row variable.  A topic is created if it doesn't exist, using the slug attribute to find/create.  The `find_or_create_by` method included in ActiveModel streamlines this action.  Once that topic is available, the record is assigned to the top variable.

Since each row of the file relates a Topic to a verse through a vote, each line of the file will create a vote.  This Vote record will link the relationship between the Verse and Topic with a `has_many, through:` relationship.  Since this import may run mulitple times, each time with new records, and new data for vote tallys, we find the existing Vote record or update the one that exists.  Issuing a `first_or_initialize` on the ActiveRecord::Criteria returns a new (unsaved) instance if no records are returned.  If at least one record exists, the first in scope is returned.  This is similar to the `find_or_create_by` called before, but works with multiple attributes.

The Verse may or may not exist.  We only know about the slug of the Verse which embeds the Book, Chapter, and Verse in a string.  A Vote can exist for a verse or a series of verses, so the verse_end is assigned when the initialize invokes.  If the where method returns a non-empty collection, arguments to the method are not evaluated.

Once the vote is found/created, the tally is updated.  The progressbar was initially set at the size of the file, so each line increments the progress.  The import is slow (relative), so feedback is important to know the process hasn't stalled.

Now that we have a topic to verse relationship, we can train naive bayes to classify prayers based on their topic.  Once naive bayes knows what to look for, it will choose which verse to recommend based on statistical analysis using Bayesian probability.  [Part II](/praybook/2016/03/25/prayer-lexer-part-2.html) incudes reversing the relationship so each of the verses become categories and the topics are used to train the classifier.

Check out the Github repository at [AndyGauge/prayer-lexer](https://github.com/andygauge/prayer-lexer)
