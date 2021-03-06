from django.db import models

class User(models.Model):
    name = models.CharField(max_length=200)
    rank = models.IntegerField(null=True)
    joined_date = models.DateTimeField('joined', null=True)
    wins = models.IntegerField(null=True)
    losses = models.IntegerField(null=True)

    def __unicode__(self):
        return self.name

class Game(models.Model):
    end_time = models.DateTimeField('end_time')
    winner = models.ForeignKey(User, related_name='game_winner')
    losers = models.ManyToManyField(User, related_name='game_losers')

    def __unicode__(self):
        return str(self.end_time)


