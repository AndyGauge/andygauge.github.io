---
layout: post
section-type: post
title: 'Prayer Lexer - Building Recommended Verse part 2'
category: praybook
tags: [ 'prayer' ]
---

OpenBible.info provides a topical mashup, driven by the community.  The topics are added to the site by searching, and scripture is recommended to each topic.  When users find a verse helpful for the topic, they can chose to vote up the verse per topic.  A weekly dump is made of the data, and offered through the api. 

[Previously](/praybook/2016/03/20/prayer-lexer.html) the blog explained how these entries were saved to an ActiveRecord database, using a `has_many :through` relationship.  Topics and Verses were related through Votes.  First the data model is finished through some modifications to the Verse model.

When a verse is saved, only the slug is known, but that contains enough information to fill in the Book, Chapter, and Verse attributes.  I don't recommend having an attribute the same name as the model, so this should have been a Scripture model rather than a Verse model with a verse attribute.

The first step was to create a means for looking up book names.  I wasn't convinced this would only be needed on the Verse model, so I put the logic in a concern.  ActiveSupport::Concerns are a neat (as in tidy) way to wrap the ruby mixin functionality for adding shared functionality.  The pattern comes from [AOT](http://en.wikipedia.org/wiki/Aspect-oriented_programming).  Here, we make an instance class method to return the books of the bible (so we don't have to include a tacky self reference).

    # app/models/concerns/biblical.rb
    require 'active_support/concern'
    
    module Biblical
      extend ActiveSupport::Concern
    
      def biblical_books
        %w{ not Genesis Exodus Leviticus Numbers Deuteronomy Joshua Judges Ruth 1\ Samuel 2\ Samuel 1\ Kings 2\ Kings
            1\ Chronicles 2\ Chronicles Ezra Nehemiah Esther Job Psalms Proverbs Ecclesiastes Song\ of\ Solomon Isaiah
            Jeremiah Lamentations Ezekiel Daniel Hosea Joel Amos Obadiah Jonah Micah Nahum Habakkuk Zephaniah Haggai
            Zechariah Malachi Matthew Mark Luke John Acts\ of\ the\ Apostles Romans 1\ Corinthians 2\ Corinthians
            Galatians Ephesians Philippians Colossians 1\ Thessolonians 2\ Thessalonians 1\ Timothy 2\ Timothy Titus
            Philemon Hebrews James 1\ Peter 2\ Peter 1\ John 2\ John 3\ John Jude Revelation }.freeze
      end
    end

The slug starts with value 1 being Genesis, so `biblical_books[0]` is set to not.  The spaces are injected to an Array litteral separated by spaces `%w{}`.  This creates an array of strings that map to the intended books following the slug format of:

    'BBCCCVVV'

The verse implements a `before_save` callback to update the book, chapter, and verse information as follows:

    # app/models/verse.rb
      include Biblical

      before_save do |verse|
        self.book ||= biblical_books[slug[0..1].to_i]
        self.chapter ||= slug[2..4].to_i
        self.verse ||= slug[5..7].to_i
      end

      def inspect
        "#{book} #{chapter}:#{verse}"
      end

If the book attribute has not be filled in, a lookup to the biblical_books, passing in a slice of the array converted to an integer is used to populate book.  The first two digits of the slug are use the overloaded positional operator.  Setting chapter and verse to the integer values of the slug parts effectively strips the 0s that are padding in the slug.

Inspect is the name of the function that returns in the rails console.  The best formatting for a scripture follows the convention outlined here. 

Training Bayes
==============

To start out, I used [classifier-reborn](https://github.com/jekyll/classifier-reborn) because cardmagic's repo didn't seem to be active.  This is a fork that I found in a pull request sitting in cardmagic's pull request queue for over 2 years.  It is likely the code would have 'just worked' with `classifier`.

The classifier logic currently sits in the importer.rb file, but should move to a class, once the request/response part gets built out.

    def self.train
       Vote.all.each do |vote|
         classifier.train(vote.verse_id, vote.topic.slug)
       end
       classifier_snapshot = Marshal.dump classifier
       File.open(snapshot, "wb") {|file| file.write(classifier_snapshot) }
     end

     def self.classifier
       @classifier ||= File.exists?(snapshot) ? retrieve_snapshot : new_classifier
     end

     def self.retrieve_snapshot
       data = File.open(snapshot, 'rb') { |file| file.read }
       Marshal.load data
     end

     def self.snapshot
       Rails.root.join('classifier.dat')
     end

     def self.new_classifier
       ClassifierReborn::Bayes.new Vote.pluck(:verse_id).uniq
     end

The `self.train` method has an associated rake task that calls it.  This part of the new API allows existing Votes to be registered as training for the classifier.  Before the training can happen though, the classifier is instanciated.  There is logic in `self.classifier` to prefer loading a file rather than training the classifier each time.

To create a new classifier, as seen in `self.new_classifier`, an argument is sent to `ClassifierReborn::Bayes.new` which represent the categories of classification.  For this application, the individual beginning verses are used as categories.  To get the beginning verses rather than all verses, the Vote records are used.  This creates an array, instanciates a classifier, and zips up stack back into the train class method.

Bayesian classification takes a series of tokens and collects them for each category.  To collect these tokens, strings are passed to each of the categories, and these strings are converted to tokens.  The actual representation of these tokens are word fragments, unconjugated, so the tense, possessiveness, and word part blur.  If the training included being; be, been, and be's should match as well.

The training of the classifier associates many topics to one verse, making some verses richer than others.  Some verses appear in 10 or more topics.  Once the classifier is fully trained the object is marshaled and saved to disk.  Loading the classifier from the dat file takes around one second as opposed to many minutes.  

Finding a verse from a prayer can be performed as such:

    rails c

    irb(main):001:0> require 'importer'
    => true
    irb(main):002:0> Verse.find(Importer.classifier.classify "Fill me with the holy spirit")
    => "Acts of the Apostles 13:52"

The logic for the classifier should likely move to a better location.  Feel free to comment below where you think it fits best.

The files can be found at [AndyGauge/prayer-lexer](https://github.com/andygauge/prayer-lexer)